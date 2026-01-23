using System.Windows;
using WindowsApp.ViewModels;

namespace WindowsApp.Views
{
    public partial class ConnectionInputWindow : Window
    {
        public ConnectionInputWindow()
        {
            InitializeComponent();
            DataContext = new ConnectionInputViewModel();

            // Auto-focus the first input field
            Loaded += (s, e) => SixDigitCodeTextBox.Focus();
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }
}
