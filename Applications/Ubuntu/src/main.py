"""
Main entry point with environment detection and launcher.
"""
import sys
import os
import asyncio
import logging
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from core.utils.environment import EnvironmentDetector
from core.models import AppConfig, Role, RiskLevel, ToolPolicy
from core.services.storage import SecureStorage
from core.services.audit_logger import AuditLogger
from core.services.notification import NotificationService
from core.services.idle_check import IdleCheckService
from core.auth.device_registration import DeviceRegistrationService
from core.tools.registry import ToolRegistry
from core.tools.authorization import AuthorizationEngine
from core.mcp.client import MCPClient
from core.mcp.dispatcher import ToolDispatcher

# Import all tools
from core.tools.system import (
    CheckCPUUsageTool,
    CheckMemoryUsageTool,
    CheckDiskUsageTool,
    CheckSystemUptimeTool,
    CheckSystemLogsTool,
    CheckNetworkStatusTool,
    CheckIPAddressTool,
    ClearTmpFilesTool,
    ClearUserCacheTool,
    RestartSystemTool,
    ExecuteTerminalCommandTool,
)
from core.tools.network import (
    FlushDNSCacheTool,
    RenewIPAddressTool,
    ResetNetworkStackTool,
    NetworkAdapterResetTool,
)
from core.tools.service import (
    RestartWhitelistedServiceTool,
    RestartAnyServiceTool,
    RestartApplicationTool,
    PackageUpdateRepairTool,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)


class ApplicationState:
    """Application state manager."""

    def __init__(self, config: AppConfig, use_gui: bool):
        """Initialize application state."""
        self.config = config
        self.use_gui = use_gui
        self.storage = None
        self.audit_logger = None
        self.notification_service = None
        self.idle_check = None
        self.registry = None
        self.authorization = None
        self.mcp_client = None
        self.dispatcher = None
        self.ui_app = None

    async def initialize(self):
        """Initialize all components."""
        # Initialize storage
        self.storage = SecureStorage(
            config_dir=self.config.config_dir,
            jwt_secret=self.config.jwt_secret,
        )

        # Initialize audit logger
        if self.config.enable_audit_logging:
            self.audit_logger = AuditLogger(log_dir=self.config.log_dir)

        # Initialize notification service
        if self.config.enable_notifications:
            self.notification_service = NotificationService(use_gui=self.use_gui)

        # Initialize idle check
        self.idle_check = IdleCheckService(idle_threshold_seconds=300)

        # Initialize tool registry
        self.registry = ToolRegistry()
        self._register_tools()

        # Initialize authorization engine
        self.authorization = AuthorizationEngine(idle_checker=self.idle_check)

        # Check if device is registered
        credentials = self.storage.load_credentials()
        if not credentials:
            logger.info("Device not registered. Starting registration...")
            await self._register_device()
            credentials = self.storage.load_credentials()

        if not credentials:
            raise RuntimeError("Device registration failed")

        # Initialize MCP client
        # Backend expects /ws/device/{device_id} endpoint
        # Convert http://host:port/api -> ws://host:port/ws/device/{device_id}
        backend_url = self.config.backend_api_url
        
        # Remove /api suffix if present (WebSocket endpoint is at /ws, not /api/ws)
        if backend_url.endswith('/api'):
            backend_url = backend_url[:-4]
        elif backend_url.endswith('/api/'):
            backend_url = backend_url[:-5]
        
        # Convert http/https to ws/wss
        ws_url = backend_url.replace("http://", "ws://").replace("https://", "wss://")
        
        # Add the WebSocket endpoint
        ws_url = f"{ws_url}/ws/device/{credentials['device_id']}"
        
        logger.info(f"Connecting to WebSocket endpoint: {ws_url}")
        
        self.mcp_client = MCPClient(
            backend_url=ws_url,
            jwt_token=credentials["token"],
            device_id=credentials["device_id"],
            reconnect_delay=self.config.reconnect_delay_seconds,
            connection_timeout=self.config.connection_timeout_seconds,
        )

        # Initialize dispatcher
        self.dispatcher = ToolDispatcher(
            registry=self.registry,
            authorization=self.authorization,
            audit_logger=self.audit_logger,
            notification_service=self.notification_service,
        )

        # Set up MCP client message handler
        self.mcp_client.set_message_handler(self._handle_tool_call)
        self.mcp_client.set_status_change_handler(self._handle_status_change)

    def _register_tools(self):
        """Register all available tools."""
        # System tools - AI_AGENT
        self.registry.register(
            CheckCPUUsageTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=30,
            ),
        )
        self.registry.register(
            CheckMemoryUsageTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=30,
            ),
        )
        self.registry.register(
            CheckDiskUsageTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=30,
            ),
        )
        self.registry.register(
            CheckSystemUptimeTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=10,
            ),
        )
        self.registry.register(
            CheckSystemLogsTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=60,
            ),
        )
        self.registry.register(
            CheckNetworkStatusTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=30,
            ),
        )
        self.registry.register(
            CheckIPAddressTool(),
            ToolPolicy(
                min_role=Role.AI_AGENT,
                risk_level=RiskLevel.SAFE,
                timeout_seconds=10,
            ),
        )

        # Cleanup tools - HUMAN_AGENT
        self.registry.register(
            ClearTmpFilesTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=120,
            ),
        )
        self.registry.register(
            ClearUserCacheTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=120,
            ),
        )

        # Network tools - HUMAN_AGENT
        self.registry.register(
            FlushDNSCacheTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=30,
                requires_sudo=True,
            ),
        )
        self.registry.register(
            RenewIPAddressTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=60,
                requires_sudo=True,
            ),
        )
        self.registry.register(
            ResetNetworkStackTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.ELEVATED,
                timeout_seconds=60,
                requires_sudo=True,
                requires_confirmation=True,
            ),
        )
        self.registry.register(
            NetworkAdapterResetTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=30,
                requires_sudo=True,
            ),
        )

        # Service tools
        self.registry.register(
            RestartWhitelistedServiceTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=60,
                requires_sudo=True,
            ),
        )
        self.registry.register(
            RestartAnyServiceTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.ELEVATED,
                timeout_seconds=120,
                requires_sudo=True,
                requires_confirmation=True,
            ),
        )
        self.registry.register(
            RestartApplicationTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.CAUTION,
                timeout_seconds=60,
            ),
        )
        self.registry.register(
            PackageUpdateRepairTool(),
            ToolPolicy(
                min_role=Role.ADMIN,
                risk_level=RiskLevel.ELEVATED,
                timeout_seconds=600,
                requires_sudo=True,
                requires_confirmation=True,
            ),
        )

        # System restart - ADMIN
        self.registry.register(
            RestartSystemTool(),
            ToolPolicy(
                min_role=Role.ADMIN,
                risk_level=RiskLevel.ELEVATED,
                timeout_seconds=30,
                requires_sudo=True,
                requires_confirmation=True,
                requires_idle=True,
            ),
        )

        # Execute terminal command - HUMAN_AGENT and ADMIN only
        self.registry.register(
            ExecuteTerminalCommandTool(),
            ToolPolicy(
                min_role=Role.HUMAN_AGENT,
                risk_level=RiskLevel.ELEVATED,
                timeout_seconds=300,  # 5 minute max timeout
                requires_sudo=False,  # Command itself may need sudo
                requires_confirmation=True,
            ),
        )

        logger.info(f"Registered {len(self.registry)} tools")

    async def _register_device(self):
        """Register device with backend."""
        registration_service = DeviceRegistrationService(
            backend_url=self.config.backend_api_url,
            storage=self.storage,
        )

        if self.use_gui:
            # Use GUI registration
            try:
                from gui.login_window import LoginWindow
                from PyQt6.QtWidgets import QApplication

                app = QApplication.instance() or QApplication(sys.argv)
                dialog = LoginWindow()

                # Connect signal
                dialog.registration_requested.connect(
                    lambda email, code: asyncio.create_task(
                        self._do_registration(registration_service, email, code, dialog)
                    )
                )

                if dialog.exec():
                    logger.info("Device registered successfully")
                else:
                    raise RuntimeError("Device registration cancelled")

            except ImportError:
                logger.warning("PyQt6 not available, falling back to CLI registration")
                await self._register_device_cli(registration_service)
        else:
            # Use CLI registration
            await self._register_device_cli(registration_service)

    async def _do_registration(self, service, email, code, dialog):
        """Perform device registration."""
        try:
            success = await service.register_device(email, code)
            if success:
                dialog.show_success("Device registered successfully!")
            else:
                dialog.show_error("Registration failed. Please try again.")
        except Exception as e:
            dialog.show_error(str(e))

    async def _register_device_cli(self, registration_service):
        """Register device via CLI."""
        print("\n=== Device Registration ===")
        email = input("Email: ").strip()
        ue_code = input("UE Code: ").strip()

        if not email or not ue_code:
            raise RuntimeError("Email and UE code are required")

        # Get or create device ID
        device_id = self.storage.get_or_create_device_id()

        # Register device
        response = await registration_service.register_device(email, ue_code, device_id)

        if not response.success:
            raise RuntimeError(f"Device registration failed: {response.error}")

        # Save credentials
        # Use the device_id we sent if backend doesn't return one
        saved_device_id = response.device_id if response.device_id else device_id

        self.storage.save_auth_data(
            email=email,
            token=response.token,
            device_id=saved_device_id,
            client_id=response.client_id,
            user_id=response.user_id,
        )

        print(f"Device registered successfully!")
        print(f"Device ID: {saved_device_id}")
        print(f"Token: {response.token[:20]}...")

    async def _handle_tool_call(self, tool_call):
        """Handle incoming tool call."""
        logger.info(f"Received tool call: {tool_call.name}")

        # Dispatch tool execution
        result = await self.dispatcher.dispatch(tool_call)

        # Send result back to backend
        await self.mcp_client.send_tool_result(result)

        # Update UI if available
        if self.ui_app:
            if hasattr(self.ui_app, 'show_tool_execution'):
                self.ui_app.show_tool_execution(
                    tool_call.name,
                    tool_call.role.name,
                    result.status,
                    result.execution_time_ms,
                )

    async def _handle_status_change(self, status):
        """Handle connection status change."""
        logger.info(
            f"Connection status changed: "
            f"{'connected' if status.is_connected else 'disconnected'}"
        )

        # Notify
        if self.notification_service:
            await self.notification_service.notify_connection_status(
                status.is_connected,
                status.backend_url,
                status.last_error,
            )

        # Update UI if available
        if self.ui_app:
            if hasattr(self.ui_app, 'show_connection_status'):
                self.ui_app.show_connection_status(
                    status.is_connected,
                    status.backend_url,
                )

    def get_connection_status(self):
        """Get current connection status."""
        if self.mcp_client:
            return self.mcp_client.get_status()
        return None

    def get_tool_registry(self):
        """Get tool registry."""
        return self.registry

    def get_audit_logger(self):
        """Get audit logger."""
        return self.audit_logger

    def shutdown(self):
        """Shutdown application."""
        logger.info("Shutting down application...")
        if self.mcp_client:
            asyncio.create_task(self.mcp_client.stop())


async def run_gui(app_state: ApplicationState):
    """Run GUI application."""
    from gui.main_window import MainWindow
    from gui.tray_icon import TrayIcon
    from PyQt6.QtWidgets import QApplication

    app = QApplication(sys.argv)
    app.setApplicationName("Ubuntu MCP Agent")
    app.setQuitOnLastWindowClosed(False)

    # Create main window
    main_window = MainWindow(app_state)
    app_state.ui_app = main_window

    # Create tray icon
    tray_icon = TrayIcon()
    tray_icon.show_window_requested.connect(main_window.show)
    tray_icon.quit_requested.connect(app.quit)
    tray_icon.show()

    # Start MCP client
    asyncio.create_task(app_state.mcp_client.run())

    # Show window
    main_window.show()

    # Run Qt event loop
    app.exec()


async def run_cli(app_state: ApplicationState):
    """Run CLI application."""
    from cli.main import CLIApplication

    cli_app = CLIApplication(app_state)
    app_state.ui_app = cli_app

    # Start MCP client in background
    client_task = asyncio.create_task(app_state.mcp_client.run())

    # Run CLI
    try:
        await cli_app.run()
    finally:
        client_task.cancel()
        try:
            await client_task
        except asyncio.CancelledError:
            pass


def main():
    """Main entry point."""
    # Parse arguments
    parser = argparse.ArgumentParser(description="Ubuntu MCP Agent")
    parser.add_argument(
        "--cli",
        action="store_true",
        help="Force CLI mode",
    )
    parser.add_argument(
        "--gui",
        action="store_true",
        help="Force GUI mode",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()

    # Set log level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    # Detect environment
    env_info = EnvironmentDetector.get_environment_info()
    logger.info("Environment detected:")
    for key, value in env_info.items():
        logger.debug(f"  {key}: {value}")

    # Determine UI mode
    use_gui = EnvironmentDetector.should_use_gui(
        force_cli=args.cli,
        force_gui=args.gui,
    )

    logger.info(f"Using {'GUI' if use_gui else 'CLI'} mode")

    # Load configuration
    config = AppConfig(
        backend_api_url=os.getenv("BACKEND_API_URL", "http://localhost:3000"),
        jwt_secret=os.getenv("JWT_SECRET", "your-secret-key"),
        force_cli=args.cli,
    )

    # Initialize application state
    app_state = ApplicationState(config, use_gui)

    # Run application
    try:
        asyncio.run(_run_app(app_state, use_gui))
    except KeyboardInterrupt:
        logger.info("Application interrupted")
    except Exception as e:
        logger.error(f"Application error: {e}", exc_info=True)
        sys.exit(1)


async def _run_app(app_state: ApplicationState, use_gui: bool):
    """Run the application."""
    await app_state.initialize()

    if use_gui:
        await run_gui(app_state)
    else:
        await run_cli(app_state)


if __name__ == "__main__":
    main()
