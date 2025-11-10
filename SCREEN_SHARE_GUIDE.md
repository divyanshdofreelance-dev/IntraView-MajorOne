# 📺 Screen Share Invisibility Guide

## Understanding the Two Windows

Your IntraView HUD has **TWO separate windows**:

### 1. 🖥️ Electron Chat Window (VISIBLE in screen share)
- **What it is**: The transparent window with "AI Assistant + Overlay" header
- **Purpose**: Type messages, interact with AI, control the app
- **Screen Capture**: ⚠️ **VISIBLE** - Electron windows cannot be hidden from capture
- **What to do**: **Hide this before screen sharing!**

### 2. 👁️ C++ Overlay Window (INVISIBLE in screen share)
- **What it is**: Native Windows overlay created with Direct2D
- **Purpose**: Display text that ONLY YOU can see during screen shares
- **Screen Capture**: ✅ **INVISIBLE** - Uses `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`
- **What to do**: This stays visible on your screen, invisible to others!

---

## 🎯 Correct Workflow for Screen Sharing

### Before Starting Screen Share:

1. **Open the app** (`npm start`)
2. **Type your question** in the Electron chat window
3. **Get AI response** - it appears in both:
   - ✅ Electron window (you can see it)
   - ✅ C++ overlay (automatically synced, invisible to capture)
4. **Click the Minimize button (➖)** in the Electron window
   - This hides the Electron window from your screen
   - The C++ overlay remains visible (to you only!)
5. **Start your Google Meet/Zoom screen share**

### During Screen Share:

- **Your view**: You see the C++ overlay with AI responses
- **Others' view**: They see ONLY your desktop/apps, NO overlay
- **Toggle overlay**: Press `Ctrl+Shift+O` to show/hide the C++ overlay (invisible to them)

### After Screen Share:

- Click the app in taskbar to restore the Electron window
- Continue chatting with AI
- Minimize again if you need to share screen more

---

## 🔄 Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Ask AI a Question                                   │
├─────────────────────────────────────────────────────────────┤
│ Electron Window (Visible):                                  │
│ ┌─────────────────────────────────────────────────┐         │
│ │ AI Assistant + Overlay              ➖  👁️     │         │
│ │─────────────────────────────────────────────────│         │
│ │ You: How do I calculate compound interest?      │         │
│ │                                                  │         │
│ │ AI: Compound interest formula is A = P(1+r/n)^nt│         │
│ │ where...                                         │         │
│ │─────────────────────────────────────────────────│         │
│ │ [Type message...]                          Send │         │
│ └─────────────────────────────────────────────────┘         │
│                                                              │
│ C++ Overlay (Invisible to capture):                         │
│ ┌───────────────────────────────────┐                       │
│ │ Compound interest formula is      │                       │
│ │ A = P(1+r/n)^nt where...          │                       │
│ └───────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Click Minimize Button (➖)                          │
├─────────────────────────────────────────────────────────────┤
│ Electron Window: ❌ HIDDEN (not on screen)                  │
│                                                              │
│ C++ Overlay (Still visible to you):                         │
│ ┌───────────────────────────────────┐                       │
│ │ Compound interest formula is      │                       │
│ │ A = P(1+r/n)^nt where...          │                       │
│ └───────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Start Google Meet Screen Share                      │
├─────────────────────────────────────────────────────────────┤
│ YOUR SCREEN:                                                 │
│ ┌─────────────────────────────────────┐                     │
│ │ [Your desktop/apps]                 │                     │
│ │                                      │                     │
│ │ ┌─────────────────────────┐         │                     │
│ │ │ Compound interest is... │ ← YOU SEE THIS               │
│ │ └─────────────────────────┘         │                     │
│ └─────────────────────────────────────┘                     │
│                                                              │
│ GOOGLE MEET PARTICIPANTS SEE:                               │
│ ┌─────────────────────────────────────┐                     │
│ │ [Your desktop/apps]                 │                     │
│ │                                      │                     │
│ │                                      │ ← NO OVERLAY       │
│ │                                      │                     │
│ └─────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎮 Controls Reference

### Electron Window Controls
| Button | Icon | Function | Keyboard Shortcut |
|--------|------|----------|-------------------|
| Minimize | ➖ | Hide Electron window (use before screen share) | - |
| Toggle Overlay | 👁️ | Show/hide C++ overlay | `Ctrl+Shift+O` |
| Send | Send | Send message to AI | `Enter` |

### Keyboard Shortcuts
| Shortcut | Function |
|----------|----------|
| `Ctrl+Shift+O` | Toggle C++ overlay visibility (global) |
| `Enter` | Send chat message |
| `Shift+Enter` | New line in chat |

---

## ✅ Testing Checklist

### Test 1: Verify Auto-Sync
1. Start app
2. Type: "Hello, test message"
3. Click Send
4. **Verify**: AI response appears in BOTH:
   - Electron chat window
   - C++ overlay window

### Test 2: Verify Minimize
1. Click minimize button (➖)
2. **Verify**: Electron window disappears from screen
3. **Verify**: C++ overlay still visible
4. Click app in taskbar
5. **Verify**: Electron window reappears

### Test 3: Verify Screen Capture Invisibility
1. Ensure C++ overlay is visible (`Ctrl+Shift+O` if needed)
2. Click minimize button (➖) to hide Electron window
3. Open Google Meet: https://meet.google.com/
4. Start a test meeting
5. Click "Present" → "Your entire screen"
6. **VERIFY:**
   - ✅ You see the C++ overlay on your screen
   - ✅ The preview window does NOT show the overlay
   - ✅ Participants do NOT see the overlay

---

## 🚨 Common Mistakes

### ❌ WRONG: Leaving Electron Window Visible
```
Problem: Both windows visible during screen share
Result: Participants see your AI chat window
Solution: Click minimize (➖) before sharing
```

### ❌ WRONG: Hiding C++ Overlay
```
Problem: Pressing Ctrl+Shift+O to hide overlay
Result: You can't see your notes during presentation
Solution: Keep C++ overlay visible (it's invisible to them anyway!)
```

### ❌ WRONG: Not Syncing to Overlay
```
Problem: Overlay shows old/empty text
Result: You don't see your latest AI response
Solution: Latest AI response auto-syncs to overlay (v2.0+)
```

---

## 🎯 Use Cases

### Presentation Prompts
```
1. Open app, ask AI for presentation tips
2. AI response appears in overlay
3. Minimize Electron window
4. Start screen share
5. Read overlay during presentation (invisible to audience)
```

### Interview Assistance
```
1. Paste interview question to AI
2. Read answer from C++ overlay
3. Overlay invisible to interviewer's screen share view
```

### Meeting Notes
```
1. Type meeting agenda/notes in chat
2. Notes appear in overlay
3. Reference during screen share presentation
```

---

## 🔧 Customization

### Change Overlay Text Manually
Currently AI responses auto-sync. To send custom text:
```typescript
// In browser console (F12):
window.electronAPI.overlay.updateText("Your custom text here");
```

### Change Overlay Position/Size
Edit `overlay/src/OverlayWindow.cpp`:
```cpp
// Line ~80-85
int x = (screenWidth - width) / 2;    // Center X
int y = (screenHeight - height) / 2;  // Center Y
```

Then rebuild:
```cmd
npm run build:overlay
```

---

## 📊 Comparison: What's Visible Where?

| Element | Your Screen | Google Meet Share | Screenshot (PrtScn) |
|---------|-------------|-------------------|---------------------|
| Electron Window (not minimized) | ✅ Visible | ⚠️ **VISIBLE** | ⚠️ **VISIBLE** |
| Electron Window (minimized) | ❌ Hidden | ✅ Hidden | ✅ Hidden |
| C++ Overlay | ✅ Visible | ✅ **INVISIBLE** | ✅ **INVISIBLE** |
| Desktop/Apps | ✅ Visible | ✅ Visible | ✅ Visible |

---

## 💡 Pro Tips

1. **Pre-load responses**: Ask AI all your questions before the meeting, they stay in overlay
2. **Use hotkey**: `Ctrl+Shift+O` works even when other apps are focused
3. **Multi-monitor**: Overlay appears on primary monitor (customize in code if needed)
4. **Quick hide**: Alt+Tab away from Electron window instead of minimizing
5. **Emergency hide**: `Ctrl+Shift+O` instantly hides overlay if needed

---

## 🐛 Troubleshooting

### "Overlay still visible in screen share"
- **Check**: Is it the Electron window or C++ overlay?
- **Solution**: Click minimize (➖) on Electron window
- **Verify**: Electron window has "AI Assistant + Overlay" title

### "Can't see overlay on my screen"
- **Solution**: Press `Ctrl+Shift+O` to toggle it visible
- **Check**: Look at console output for errors

### "AI response not appearing in overlay"
- **Check**: Feature added in latest build (rebuild with `npm run build`)
- **Verify**: Console shows "[Chat] Sent response to overlay"

---

## 📚 Related Documentation

- **Main README**: `README.md` - Full app documentation
- **Setup Guide**: `SETUP_COMPLETE.md` - Installation and testing
- **C++ Overlay**: `overlay/README.md` - Technical details

---

**Key Takeaway**: The Electron chat window is for YOU to interact with AI. The C++ overlay is for DISPLAYING that content invisibly during screen shares. Use minimize (➖) to hide the chat window before sharing your screen!
