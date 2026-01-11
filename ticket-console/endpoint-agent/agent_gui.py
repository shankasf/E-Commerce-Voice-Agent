#!/usr/bin/env python3
"""
Endpoint Agent GUI - Simple GUI for non-technical users

This provides a user-friendly interface for the endpoint agent.
Users can enter enrollment codes and connect without using command line.
"""

import asyncio
import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import logging
from pathlib import Path

# Try to import GUI libraries
try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_SYSTRAY = True
except ImportError:
    HAS_SYSTRAY = False

# Import agent functionality
try:
    # Add current directory to path for PyInstaller compatibility
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        import os
        agent_dir = os.path.dirname(sys.executable)
        if agent_dir not in sys.path:
            sys.path.insert(0, agent_dir)
    
    from agent import EndpointAgent
    from config import get_config
    from auth import load_identity, clear_identity
except ImportError as e:
    print(f"ERROR: Could not import agent modules: {e}")
    print(f"Python path: {sys.path}")
    print("Make sure you're running from the endpoint-agent directory.")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ─────────────────────────────────────────────────────────────
# Logging Setup
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(Path(__file__).parent / "agent_gui.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AgentGUI")

# ─────────────────────────────────────────────────────────────
# GUI Application
# ─────────────────────────────────────────────────────────────

class AgentGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Remote Support Agent")
        self.root.geometry("500x600")
        self.root.resizable(False, False)
        
        # Try to set icon (optional)
        try:
            self.root.iconbitmap(default="")
        except:
            pass
        
        # Agent state
        self.agent = None
        self.agent_task = None
        self.connected = False
        self.enrolled = False
        
        # Load existing identity
        self.identity = load_identity()
        if self.identity:
            self.enrolled = True
        
        # Setup UI
        self.setup_ui()
        
        # Check if already enrolled
        if self.enrolled:
            self.show_connected_view()
        else:
            self.show_enrollment_view()
        
        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # System tray (if available)
        self.tray_icon = None
        if HAS_SYSTRAY:
            self.setup_system_tray()
    
    def setup_ui(self):
        """Setup the user interface."""
        # Main container
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Header
        header_frame = ttk.Frame(main_frame)
        header_frame.grid(row=0, column=0, columnspan=2, pady=(0, 20))
        
        title_label = ttk.Label(
            header_frame,
            text="Remote Support Agent",
            font=("Arial", 16, "bold")
        )
        title_label.pack()
        
        subtitle_label = ttk.Label(
            header_frame,
            text="Allow IT support to diagnose your device",
            font=("Arial", 10)
        )
        subtitle_label.pack()
        
        # Status frame (will be updated)
        self.status_frame = ttk.Frame(main_frame)
        self.status_frame.grid(row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 20))
        
        # Content frame (will be swapped)
        self.content_frame = ttk.Frame(main_frame)
        self.content_frame.grid(row=2, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Log area
        log_label = ttk.Label(main_frame, text="Connection Log:", font=("Arial", 9, "bold"))
        log_label.grid(row=3, column=0, columnspan=2, sticky=tk.W, pady=(20, 5))
        
        self.log_text = scrolledtext.ScrolledText(
            main_frame,
            height=8,
            width=60,
            state=tk.DISABLED,
            font=("Consolas", 9)
        )
        self.log_text.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E))
        
        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(0, weight=1)
    
    def log(self, message, level="INFO"):
        """Add message to log area."""
        # Always print to console for debugging
        print(f"[GUI LOG] [{level}] {message}")
        
        try:
            import datetime
            timestamp = datetime.datetime.now().strftime("%H:%M:%S")
            
            # Ensure we're on the main thread
            if threading.current_thread() is threading.main_thread():
                self._do_log_insert(timestamp, level, message)
            else:
                # Schedule on main thread
                self.root.after(0, lambda: self._do_log_insert(timestamp, level, message))
            
            # Also log to console logger
            logger.log(getattr(logging, level, logging.INFO), message)
        except Exception as e:
            # Fallback to print if GUI logging fails
            print(f"[LOG ERROR] {e}")
            print(f"[{level}] {message}")
    
    def _do_log_insert(self, timestamp, level, message):
        """Actually insert log message (must be called on main thread)."""
        try:
            self.log_text.config(state=tk.NORMAL)
            self.log_text.insert(tk.END, f"[{timestamp}] [{level}] {message}\n")
            self.log_text.see(tk.END)
            self.log_text.config(state=tk.DISABLED)
            # Force update
            self.root.update_idletasks()
        except Exception as e:
            print(f"[LOG INSERT ERROR] {e}")
    
    def show_enrollment_view(self):
        """Show enrollment code entry view."""
        # Clear content frame
        for widget in self.content_frame.winfo_children():
            widget.destroy()
        
        # Add initial log message
        self.log("Ready to enroll. Enter your enrollment code and click Connect.")
        
        # Instructions
        instructions = ttk.Label(
            self.content_frame,
            text="Enter the enrollment code provided by IT support:",
            font=("Arial", 10)
        )
        instructions.pack(pady=(0, 10))
        
        # Enrollment code entry
        code_frame = ttk.Frame(self.content_frame)
        code_frame.pack(pady=10)
        
        ttk.Label(code_frame, text="Enrollment Code:", font=("Arial", 9)).pack(side=tk.LEFT, padx=(0, 10))
        
        self.code_entry = ttk.Entry(code_frame, width=15, font=("Arial", 12, "bold"))
        self.code_entry.pack(side=tk.LEFT)
        self.code_entry.bind("<Return>", lambda e: self.handle_enroll())
        self.code_entry.focus()
        
        # Enroll button
        self.enroll_button = ttk.Button(
            self.content_frame,
            text="Connect",
            command=self.handle_enroll,
            width=20
        )
        self.enroll_button.pack(pady=10)
        
        # Update status
        self.update_status("Ready to connect", "blue")
    
    def show_connected_view(self):
        """Show connected/running view."""
        # Clear content frame
        for widget in self.content_frame.winfo_children():
            widget.destroy()
        
        # Device info
        if self.identity:
            info_text = f"Device: {self.identity.device_name}\nDevice ID: {self.identity.device_id[:20]}..."
        else:
            info_text = "Device information not available"
        
        info_label = ttk.Label(
            self.content_frame,
            text=info_text,
            font=("Arial", 10),
            justify=tk.CENTER
        )
        info_label.pack(pady=10)
        
        # Connection status
        self.connection_label = ttk.Label(
            self.content_frame,
            text="Connecting...",
            font=("Arial", 10, "bold")
        )
        self.connection_label.pack(pady=5)
        
        # Buttons
        button_frame = ttk.Frame(self.content_frame)
        button_frame.pack(pady=10)
        
        self.connect_button = ttk.Button(
            button_frame,
            text="Start Connection" if not self.connected else "Reconnect",
            command=self.handle_connect,
            width=20
        )
        self.connect_button.pack(side=tk.LEFT, padx=5)
        
        self.disconnect_button = ttk.Button(
            button_frame,
            text="Disconnect",
            command=self.handle_disconnect,
            state=tk.DISABLED if not self.connected else tk.NORMAL,
            width=20
        )
        self.disconnect_button.pack(side=tk.LEFT, padx=5)
        
        # Reset button
        reset_button = ttk.Button(
            self.content_frame,
            text="Reset Enrollment",
            command=self.handle_reset,
            width=20
        )
        reset_button.pack(pady=10)
        
        # Auto-connect if enrolled
        if self.enrolled and not self.connected:
            self.root.after(1000, self.handle_connect)
    
    def update_status(self, message, color="black"):
        """Update status display."""
        for widget in self.status_frame.winfo_children():
            widget.destroy()
        
        status_label = ttk.Label(
            self.status_frame,
            text=message,
            font=("Arial", 10, "bold"),
            foreground=color
        )
        status_label.pack()
    
    def handle_enroll(self):
        """Handle enrollment code submission."""
        code = self.code_entry.get().strip().upper()
        
        if not code:
            messagebox.showerror("Error", "Please enter an enrollment code")
            return
        
        if len(code) != 9 or '-' not in code:
            messagebox.showerror("Error", "Invalid enrollment code format. Expected: ABCD-1234")
            return
        
        self.enroll_button.config(state=tk.DISABLED)
        self.update_status("Enrolling...", "blue")
        
        # Log immediately
        print(f"[DEBUG] Starting enrollment with code: {code}")
        self.log(f"Enrolling with code: {code}")
        
        # Run enrollment in async
        def enroll_thread():
            try:
                print("[DEBUG] Enrollment thread started")
                config = get_config()
                print(f"[DEBUG] Relay URL: {config.relay_url}")
                
                self.log(f"Connecting to server: {config.relay_url}")
                self.log(f"Using enrollment code: {code}")
                
                agent = EndpointAgent(config.relay_url)
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                # Add timeout wrapper with better error handling
                async def enroll_with_timeout():
                    try:
                        print("[DEBUG] Starting WebSocket connection...")
                        self.log("Attempting WebSocket connection...")
                        print(f"[DEBUG] Calling agent.enroll({code})")
                        success, error_msg = await asyncio.wait_for(agent.enroll(code), timeout=35)
                        print(f"[DEBUG] Enrollment result: success={success}, error={error_msg}")
                        if success:
                            self.root.after(0, lambda: self.log("✅ Enrollment completed successfully"))
                        else:
                            self.root.after(0, lambda: self.log(f"❌ Enrollment failed: {error_msg}"))
                        return (success, error_msg)
                    except asyncio.TimeoutError:
                        self.root.after(0, lambda: self.log("❌ Connection timeout after 35 seconds"))
                        self.root.after(0, lambda: self.log("   Server may not be responding or enrollment code is invalid"))
                        return False
                    except Exception as e:
                        error_type = type(e).__name__
                        error_str = str(e)
                        # Don't log AttributeError for websockets.exceptions - it's a code bug, not a connection error
                        if "AttributeError" not in error_type:
                            self.root.after(0, lambda: self.log(f"❌ Connection error ({error_type}): {error_str}"))
                        return False
                
                result = loop.run_until_complete(enroll_with_timeout())
                loop.close()
                
                if isinstance(result, tuple):
                    success, error_msg = result
                else:
                    # Fallback for old return format
                    success = result
                    error_msg = "Connection failed or timed out" if not success else ""
                
                if success:
                    self.root.after(0, lambda: self.enroll_complete(True))
                else:
                    self.root.after(0, lambda: self.enroll_complete(False, error_msg or "Connection failed or timed out"))
            except Exception as e:
                error_type = type(e).__name__
                error_msg = str(e)
                self.root.after(0, lambda: self.log(f"❌ Enrollment error ({error_type}): {error_msg}"))
                
                # Provide specific error messages
                if "ConnectionRefused" in error_type or "refused" in error_msg.lower():
                    final_error = "Connection refused - is the server running?\n\nMake sure:\n- The Next.js server is running (npm run dev)\n- The server is accessible at the configured URL"
                elif "InvalidURI" in error_type or "invalid" in error_msg.lower():
                    final_error = f"Invalid server URL: {config.relay_url}\n\nCheck the server configuration."
                else:
                    final_error = f"Enrollment failed: {error_msg}"
                
                self.root.after(0, lambda: self.enroll_complete(False, final_error))
        
        threading.Thread(target=enroll_thread, daemon=True).start()
    
    def enroll_complete(self, success, error_msg=None):
        """Handle enrollment completion."""
        self.enroll_button.config(state=tk.NORMAL)
        
        if success:
            self.identity = load_identity()
            self.enrolled = True
            self.log("✅ Enrollment successful!")
            self.update_status("Enrolled successfully", "green")
            messagebox.showinfo("Success", "Enrollment successful! Starting connection...")
            self.show_connected_view()
        else:
            error_text = error_msg or "Enrollment failed. Please check the code and try again."
            self.log(f"❌ Enrollment failed: {error_text}")
            self.update_status("Enrollment failed", "red")
            
            # Provide helpful error message
            if "timeout" in error_text.lower() or "connection" in error_text.lower():
                full_error = f"{error_text}\n\nPossible causes:\n- Server is not running\n- Check your internet connection\n- Verify the server URL is correct"
            else:
                full_error = f"{error_text}\n\nPlease verify:\n- The enrollment code is correct\n- The code hasn't expired\n- Contact IT support if the problem persists"
            
            messagebox.showerror("Enrollment Failed", full_error)
    
    def handle_connect(self):
        """Handle connect button."""
        if not self.enrolled:
            messagebox.showerror("Error", "Please enroll first")
            return
        
        if self.connected:
            return
        
        self.connect_button.config(state=tk.DISABLED)
        self.update_status("Connecting...", "blue")
        self.log("Connecting to support server...")
        
        # Start agent in background
        def connect_thread():
            config = get_config()
            self.agent = EndpointAgent(config.relay_url)
            self.agent.identity = self.identity
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Run agent
            try:
                # Connect first and update status
                async def connect_and_run():
                    # Try to connect
                    connected = await self.agent.connect()
                    if connected:
                        self.root.after(0, lambda: self.connection_status_changed(True))
                        # Now run the agent (which will maintain the connection)
                        await self.agent.run()
                    else:
                        self.root.after(0, lambda: self.connection_status_changed(False, "Failed to connect"))
                
                # Run agent
                loop.run_until_complete(connect_and_run())
            except Exception as e:
                logger.error(f"Agent error: {e}")
                self.root.after(0, lambda: self.connection_status_changed(False, str(e)))
            finally:
                try:
                    loop.close()
                except:
                    pass
        
        self.agent_thread = threading.Thread(target=connect_thread, daemon=True)
        self.agent_thread.start()
    
    def connection_status_changed(self, connected, error=None):
        """Handle connection status change."""
        self.connected = connected
        
        if connected:
            self.update_status("Connected - Waiting for diagnostics", "green")
            self.connection_label.config(text="✅ Connected", foreground="green")
            self.connect_button.config(state=tk.DISABLED)
            self.disconnect_button.config(state=tk.NORMAL)
            self.log("✅ Connected to support server")
            if self.tray_icon:
                self.tray_icon.title = "Remote Support Agent - Connected"
        else:
            self.update_status("Disconnected", "red")
            self.connection_label.config(text="❌ Disconnected", foreground="red")
            self.connect_button.config(state=tk.NORMAL)
            self.disconnect_button.config(state=tk.DISABLED)
            if error:
                self.log(f"❌ Connection error: {error}")
            else:
                self.log("❌ Disconnected from support server")
            if self.tray_icon:
                self.tray_icon.title = "Remote Support Agent - Disconnected"
    
    def handle_disconnect(self):
        """Handle disconnect button."""
        if self.agent:
            self.agent.running = False
            # Close websocket in a thread-safe way
            if self.agent.websocket:
                def close_ws():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        if self.agent.websocket:
                            loop.run_until_complete(self.agent.websocket.close())
                    except:
                        pass
                    finally:
                        loop.close()
                threading.Thread(target=close_ws, daemon=True).start()
        self.connection_status_changed(False)
        self.log("Disconnected by user")
    
    def handle_reset(self):
        """Handle reset enrollment."""
        if not messagebox.askyesno("Reset Enrollment", "Are you sure you want to reset enrollment? You will need to enter a new code."):
            return
        
        clear_identity()
        self.enrolled = False
        self.identity = None
        self.connected = False
        
        if self.agent:
            self.agent.running = False
        
        self.log("Enrollment reset")
        self.show_enrollment_view()
    
    def setup_system_tray(self):
        """Setup system tray icon."""
        if not HAS_SYSTRAY:
            return
        
        # Create icon
        image = Image.new('RGB', (64, 64), color='blue')
        draw = ImageDraw.Draw(image)
        draw.ellipse([16, 16, 48, 48], fill='white')
        
        menu = pystray.Menu(
            pystray.MenuItem("Show", self.show_window),
            pystray.MenuItem("Quit", self.quit_app)
        )
        
        self.tray_icon = pystray.Icon("RemoteSupport", image, "Remote Support Agent", menu)
        
        # Start tray in separate thread
        threading.Thread(target=self.tray_icon.run, daemon=True).start()
    
    def show_window(self, icon=None, item=None):
        """Show main window."""
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
    
    def hide_window(self):
        """Hide main window to system tray."""
        self.root.withdraw()
    
    def quit_app(self, icon=None, item=None):
        """Quit application."""
        if self.agent:
            self.agent.running = False
        if self.tray_icon:
            self.tray_icon.stop()
        self.root.quit()
        self.root.destroy()
    
    def on_closing(self):
        """Handle window close event."""
        if HAS_SYSTRAY and self.tray_icon:
            # Hide to tray instead of closing
            self.hide_window()
        else:
            # Just quit
            self.quit_app()


def main():
    """Main entry point."""
    root = tk.Tk()
    app = AgentGUI(root)
    # Add welcome message to log after GUI is initialized
    root.after(100, lambda: app.log("Remote Support Agent started"))
    root.mainloop()


if __name__ == "__main__":
    main()

