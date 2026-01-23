using System;
using System.Windows;
using WindowsApp.ViewModels;

namespace WindowsApp.Views;

// Code-behind for LoginWindow
// Minimal logic as per MVVM pattern - most functionality in ViewModel
public partial class LoginWindow : Window
{
    public LoginWindow()
    {
        InitializeComponent();

        // Set DataContext to ViewModel for data binding
        DataContext = new LoginViewModel();

        // Set focus to organization code field on window load for better UX
        Loaded += (s, e) => UeCodeTextBox.Focus();
    }
}
