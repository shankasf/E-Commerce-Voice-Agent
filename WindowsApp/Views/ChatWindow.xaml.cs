using System.Windows;
using System.Windows.Input;
using WindowsApp.Services;
using WindowsApp.ViewModels;

namespace WindowsApp.Views
{
    public partial class ChatWindow : Window
    {
        private readonly ChatViewModel _viewModel;

        public ChatWindow(WebSocketClientService webSocketClient)
        {
            InitializeComponent();

            _viewModel = new ChatViewModel(webSocketClient);
            DataContext = _viewModel;

            // Subscribe to scroll events for both panes
            _viewModel.ScrollToBottomRequested += (s, e) =>
            {
                ChatScrollViewer.ScrollToEnd();
            };

            _viewModel.ExecutionScrollRequested += (s, e) =>
            {
                ExecutionScrollViewer.ScrollToEnd();
            };

            // Focus on input when window opens
            Loaded += (s, e) => MessageInput.Focus();

            // Handle window closing
            Closing += async (s, e) =>
            {
                await _viewModel.DisconnectAsync();
            };
        }

        private void MessageInput_PreviewKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                if (Keyboard.Modifiers == ModifierKeys.Shift)
                {
                    // Shift+Enter: Insert new line (let the default behavior handle it)
                    return;
                }
                else
                {
                    // Enter only: Send message
                    e.Handled = true;

                    if (_viewModel.SendMessageCommand.CanExecute(null))
                    {
                        _viewModel.SendMessageCommand.Execute(null);
                    }
                }
            }
        }
    }
}
