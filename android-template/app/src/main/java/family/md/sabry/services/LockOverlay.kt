package family.md.sabry.services

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import family.md.sabry.R

/**
 * Lock overlay — shown on top of a blocked app to inform the user that
 * the app is currently restricted by their parent's policy.
 *
 * Two reasons:
 *   - "blocked": the app is on the blocked list (e.g. social media during study hours)
 *   - "time_limit": the daily time limit for this app has been exceeded
 *
 * The overlay is non-dismissible (no swipe-to-dismiss). The only way out is:
 *   - Press the home button (which dismisses the app)
 *   - Press "Request more time" (sends a request to the parent via MainActivity)
 *
 * The overlay uses TYPE_APPLICATION_OVERLAY which requires the
 * SYSTEM_ALERT_WINDOW permission, granted explicitly by the user.
 *
 * Per engineering blueprint §10 (UI for screen time):
 *   - The lock screen shows the rule, the reason, and a "Request extension" button
 *   - The emergency call path remains accessible (we don't disable the phone entirely)
 */
class LockOverlay(
    private val context: Context,
    private val packageName: String,
    private val reason: String,
    private val onRequestMoreTime: () -> Unit,
) {

    private var overlayView: View? = null
    private val windowManager: WindowManager =
        context.getSystemService(Context.WINDOW_SERVICE) as WindowManager

    fun show() {
        if (overlayView != null) return

        val layoutParams = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_SYSTEM_ALERT,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_DISAPPEARING_ON_TOUCH_DOWN.inv(),
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.CENTER
            // Soft input mode — let the user interact with the buttons
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
        }

        overlayView = buildView()
        try {
            windowManager.addView(overlayView, layoutParams)
        } catch (e: Exception) {
            // Likely missing SYSTEM_ALERT_WINDOW permission
        }
    }

    fun hide() {
        overlayView?.let {
            try {
                windowManager.removeView(it)
            } catch (e: Exception) {
                // View not attached — ignore
            }
        }
        overlayView = null
    }

    private fun buildView(): View {
        val layout = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xF00A192F.toInt())  // Deep Navy with ~94% opacity
            setPadding(48, 96, 48, 96)
            gravity = Gravity.CENTER
        }

        val title = TextView(context).apply {
            text = when (reason) {
                "blocked" -> "هذا التطبيق محظور"
                "time_limit" -> "انتهى الوقت المسموح لهذا التطبيق"
                else -> "التطبيق محظور الآن"
            }
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 22f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }
        layout.addView(title)

        val subtitle = TextView(context).apply {
            text = when (reason) {
                "blocked" -> "تم تقييد هذا التطبيق بواسطة ولي الأمر"
                "time_limit" -> "وصلت إلى الحد اليومي المحدد من ولي الأمر"
                else -> "تم تقييد الوصول من قبل ولي الأمر"
            }
            setTextColor(0xCCFFFFFF.toInt())
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }
        layout.addView(subtitle)

        val requestBtn = Button(context).apply {
            text = "طلب وقت إضافي"
            setBackgroundColor(0xFFFF9500.toInt())  // Amber
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener {
                onRequestMoreTime()
            }
        }
        layout.addView(requestBtn)

        val emergencyBtn = Button(context).apply {
            text = "الاتصال بالطوارئ"
            setBackgroundColor(0x33FFFFFF.toInt())
            setTextColor(0xFFFFFFFF.toInt())
            setOnClickListener {
                // Launch the dialer with the parent's emergency number
                val intent = android.content.Intent(android.content.Intent.ACTION_DIAL).apply {
                    flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
        }
        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT,
        ).apply {
            topMargin = 24
        }
        layout.addView(emergencyBtn, params)

        return layout
    }
}
