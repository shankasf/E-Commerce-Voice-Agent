using System.Windows;
using WindowsApp.Models;

namespace WindowsApp.Views
{
    public partial class CommandConsentDialog : Window
    {
        public bool IsApproved { get; private set; }
        public string? DenialReason { get; private set; }

        public CommandConsentDialog(PowerShellRequestMessage command)
        {
            InitializeComponent();

            // Set command details
            CommandTypeText.Text = "PowerShell";
            DescriptionText.Text = $"{command.Description}\n\nCommand: {command.Command}";

            // Set owner to main window
            if (Application.Current.MainWindow != null && Application.Current.MainWindow.IsVisible)
            {
                Owner = Application.Current.MainWindow;
            }
        }

        private void AllowButton_Click(object sender, RoutedEventArgs e)
        {
            IsApproved = true;
            DenialReason = null;
            DialogResult = true;
            Close();
        }

        private void DenyButton_Click(object sender, RoutedEventArgs e)
        {
            // If denial reason panel is not visible, show it first
            if (DenialReasonPanel.Visibility == Visibility.Collapsed)
            {
                DenialReasonPanel.Visibility = Visibility.Visible;
                DenyButton.Content = "Confirm Deny";
                DenialReasonInput.Focus();
                return;
            }

            // User confirmed denial
            IsApproved = false;
            DenialReason = string.IsNullOrWhiteSpace(DenialReasonInput.Text) ? null : DenialReasonInput.Text.Trim();
            DialogResult = true;
            Close();
        }
    }
}
