using System;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;

namespace WindowsMcpAgent.Views;

/// <summary>
/// Window for displaying restart countdown with cancel option
/// Per Project_requirements.md Section 12 (User Experience - Restart countdown)
/// </summary>
public partial class RestartCountdownWindow : Window
{
    private int _remainingSeconds;
    private bool _cancelled = false;
    private CancellationTokenSource? _cancellationTokenSource;
    private DispatcherTimer? _countdownTimer;

    public bool WasCancelled => _cancelled;
    public bool RestartNow { get; private set; } = false;

    public RestartCountdownWindow(int delaySeconds)
    {
        InitializeComponent();
        _remainingSeconds = delaySeconds;
        UpdateCountdownDisplay();
        StartCountdown();
    }

    private void StartCountdown()
    {
        _cancellationTokenSource = new CancellationTokenSource();
        _countdownTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(1)
        };
        _countdownTimer.Tick += (s, e) =>
        {
            _remainingSeconds--;
            UpdateCountdownDisplay();
            
            if (_remainingSeconds <= 0)
            {
                _countdownTimer.Stop();
                if (!_cancelled)
                {
                    DialogResult = true;
                    Close();
                }
            }
        };
        _countdownTimer.Start();
    }

    private void UpdateCountdownDisplay()
    {
        CountdownText.Text = $"Restarting in {_remainingSeconds} seconds...";
        var progress = 100.0 - ((double)_remainingSeconds / 60.0 * 100.0);
        CountdownProgress.Value = Math.Max(0, Math.Min(100, progress));
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        _cancelled = true;
        _countdownTimer?.Stop();
        _cancellationTokenSource?.Cancel();
        DialogResult = false;
        Close();
    }

    private void ConfirmButton_Click(object sender, RoutedEventArgs e)
    {
        _cancelled = false;
        RestartNow = true;
        _countdownTimer?.Stop();
        DialogResult = true;
        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        _countdownTimer?.Stop();
        _cancellationTokenSource?.Cancel();
        base.OnClosed(e);
    }
}


