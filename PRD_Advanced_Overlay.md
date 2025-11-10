# Advanced Overlay Application for Meeting Platforms — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** November 9, 2025  
**Status:** Draft for Engineering Implementation

---

## 1. Executive Summary

A cross-platform Electron-based overlay application that runs during online meetings (Teams, Google Meet, Zoom, etc.), providing a non-intrusive overlay with features such as live transcription, audio controls/enhancements, and a "stealth" mode so the overlay is not captured in shared screens. The overlay remains visible on the user's display and in the OS process list (no attempt to hide from task manager), but should be excluded from meeting platform screen captures.

**Purpose:** Improve presenter/participant experience by delivering local-only visual and audio aids (captions, notes, controls) while preserving meeting privacy and not interfering with screen sharing.

**Intended users:** Professional presenters, meeting hosts, attendees who want private assistive overlays (captions, speaker notes), accessibility users, AV technicians.

---

## 2. Goals and Success Criteria

### Goals
- Provide an overlay window that is visible to the local user but not visible in the meeting platform's shared screen.
- Support Windows and macOS with production-ready behavior on both.
- Offer real-time transcription displayed in the overlay and optional live captions.
- Provide local audio integration (volume, mute toggle, basic enhancements) in the overlay UI.
- Maintain privacy and security; transcription and audio data respect user consent and retention policies.

### Success Criteria
- Overlay is visible locally and can be moved/resized; when user shares a screen or application window in Teams/Meet/Zoom, overlay region is not included in the shared content (tested with representative versions of these meeting platforms).
- Build runs on Windows and macOS with platform-specific code paths where necessary.
- Live transcription latency under 1.5s for typical audio quality and 90%+ word-level accuracy in quiet conditions using chosen transcription engine (or clearly documented alternate expected accuracy).
- Audio controls operate locally without interfering with meeting audio (no echo loops), and user can toggle audio processing on/off.
- Security: Transcription is opt-in; if cloud processing is used, audio is encrypted in transit; logs and transcripts follow retention policy configurable by the user.

---

## 3. Non-Goals / Constraints

- Not intended to spoof or bypass platform policies (e.g., obfuscating content to bypass recording indicators).
- Not intended to hide the process from OS-level process lists / task manager.
- Will not attempt to intercept or modify meeting platform network traffic.
- Not responsible for capturing other participants' screens or bypassing meeting security.

---

## 4. Assumptions

- Electron will be the primary framework, with native helper modules where platform APIs are required.
- The overlay must not modify meeting platform code or violate EULAs; only public OS APIs and supported desktop-capture mechanisms will be used.
- Meeting platforms may change capture behavior over time; some techniques may need maintenance.
- Transcription can be implemented with either a local ASR engine (preferred for privacy) or cloud provider (optional with clear consent).

---

## 5. Personas & User Stories

### Personas
- **Alice, Corporate Presenter:** Wants private notes and captions visible to her only while sharing a slide deck.
- **Ben, Accessibility User:** Needs live captions and simple audio enhancements not visible to others.
- **Claire, IT Admin/AV Tech:** Needs the overlay to be stable, easy to deploy and configure, and respect company data policies.

### Key User Stories
- As Alice, I want to see speaker notes and a teleprompter that are not captured by the audience when I share my screen.
- As Ben, I want live captions for the meeting audio displayed in an overlay only I see.
- As Claire, I want central policy controls and secure transcription options (local or enterprise cloud).

---

## 6. Use Cases and Flows

### Use Case: Presenting slides while sharing screen
- User opens presentation and the overlay.
- User starts screen sharing in meeting app and selects display or window to share.
- Overlay remains on the presenter's screen, but does not appear in the shared content.
- User sees live transcription in overlay and can enable/disable captions.

### Use Case: Attendee enabling captions locally
- User joins meeting and enables overlay transcription.
- Overlay listens to meeting audio (or system audio) and shows captions.
- Transcription optionally saved locally (with user consent).

### Use Case: Audio controls
- User uses overlay to adjust microphone gain or enable noise suppression (local features only).
- Changes do not create feedback to other participants beyond intended microphone settings.

---

## 7. Functional Requirements

### High-level Functional Requirements (FR)

**FR-001: Overlay window**
- The app provides an always-on-top overlay window that is interactable (move, resize, configure).
- Overlay supports multiple components: transcription pane, notes/teleprompter, and audio controls.

**FR-002: Screen-share exclusion**
- When user starts screen sharing in supported meeting platforms, overlay contents are not included in the capture that other participants see.
- Implement platform-specific approaches: exclusion zones, layered windows, or using OS capture-exclusion APIs where available.

**FR-003: Cross-platform support**
- Provide behavior parity on Windows 10/11 and macOS (modern supported versions). Document any OS-specific limitations.

**FR-004: Live transcription**
- Real-time speech-to-text from meeting audio or microphone input.
- Support languages (initially en-US; extensible).
- Option to store transcripts locally (encrypted) or send to cloud provider with explicit consent.

**FR-005: Audio integration**
- Controls for mute/unmute, mic gain, basic DSP (noise suppression, AGC) as optional local modules.
- Respect meeting app audio streams: the overlay should not inject audio into meeting in unexpected ways.

**FR-006: Stealth Mode**
- Provide a "Stealth Mode" setting ensuring overlay is not captured during screen-share while remaining visible locally and in process lists. Document exact operational definition and limitations.

**FR-007: Permissions & onboarding**
- App prompts users for microphone/system audio capture permission with clear privacy UI.
- Provide explicit opt-in for cloud transcription.

**FR-008: Accessibility**
- Overlay must be keyboard navigable and support screen readers for UI controls.

**FR-009: Logging and telemetry**
- Minimal telemetry to support diagnostics, opt-in. No PII or transcripts in telemetry.

---

## 8. Non-Functional Requirements (NFR)

**NFR-001: Performance**
- Overlay must have minimal CPU impact (target <5% CPU on typical laptop for idle overlay without transcription).
- Transcription pipeline should have sub-1.5s median latency.

**NFR-002: Reliability**
- App should recover gracefully from permission changes or meeting platform restarts.

**NFR-003: Security**
- Secure storage of any transcripts (AES-256 at rest).
- TLS 1.2+ for any cloud communications.

**NFR-004: Privacy**
- Default transcription off; explicit consent required to send audio to cloud.
- Provide UI for deleting local transcripts.

**NFR-005: Maintainability**
- Clear modular architecture to update platform-specific code when meeting platforms change.

**NFR-006: Cross-platform parity**
- Core features functional on both OSes; if a feature is OS-limited, it must be documented and tested.

---

## 9. UX / UI Design and Interaction

### Design Goals
- Minimal, non-distracting overlay with adjustable opacity.
- Quick controls for transcription on/off, audio mute toggle, and a compact notes view.

### UI Components
- **Transcription panel:** scrollable text, speaker detection tag, timestamp, copy/export button.
- **Teleprompter/Notes:** large-font text area for presenter notes; optional auto-scroll.
- **Audio widget:** mute, microphone level meter, noise suppression toggle.
- **Settings modal:** choose transcription mode (local/cloud), language, retention, privacy options, capture-exclusion test.

### Onboarding Flow
- On first run: show privacy and permission screens; run a quick "screen-share capture test" to validate exclusion (see testing section).
- Provide an escape/hide hotkey, and a "diagnose capture" tool that takes a screenshot or uses platform APIs to show what would be shared (subject to OS capabilities and privacy).

### Accessibility
- Ensure high contrast mode, keyboard shortcuts, and ARIA labels for Electron-based components.

### Edge UX Cases
- When overlay is not excluded by current platform/capture method, show a clear warning and suggested mitigation (e.g., use window share instead of display share).

---

## 10. Technical Architecture

### High-level Components
- **Electron main process:** app lifecycle, native modules, permissions.
- **Renderer processes:** overlay UI, settings.
- **Native helper modules:**
  - **Windows:** a native Node addon or helper executable to configure layered windows, DWM options, and attempt capture-exclusion (e.g., via SetWindowDisplayAffinity, HWND layering, or DirectComposition approaches).
  - **macOS:** helper using Cocoa APIs (NSWindow level, CGWindow/CGDisplay APIs) to manage capture behavior and set window level/visibility appropriately. Explore private vs public APIs; prefer documented APIs.
- **Transcription service:**
  - **Local ASR:** optional integration with open-source models (VOSK, Whisper local via Rust/Python bridge) for privacy.
  - **Cloud ASR:** optional provider (Azure Speech, Google Speech-to-Text) behind opt-in flow.
- **Audio pipeline:**
  - Capture/monitor system audio or microphone input with appropriate permissions (using WebAudio or native capture).
  - Applying optional DSP via native libs.
- **IPC / Security:**
  - Secure IPC between Electron main and helper processes; signed native helpers where applicable.
  - Store sensitive config (API keys) securely using OS keychain (Windows Credential Manager, macOS Keychain).
- **Persistence:**
  - Local storage for settings (encrypted where needed) and transcripts (optional encrypted files).

### Data Flows
- Meeting audio → (optional) local capture → transcription engine → overlay UI.
- Microphone control actions → local audio processing modules → system/meeting app microphone stream (careful coordination to avoid interference).

### Architecture Diagram (Textual)
```
[Renderer UI] <--> [Electron Main] <--> [Native Helper (Windows/macOS)]
[Electron Main] <--> [Local ASR engine] and/or [Cloud ASR]
[Electron Main] <--> [Audio capture module] <--> [System audio / mic]
```

### Design Contract (Short)
- **Inputs:** system audio and microphone (when permitted); user settings; meeting app running locally.
- **Outputs:** local UI overlay; optional saved transcript files; optional cloud transcription requests (if consented).
- **Error modes:** permission denied, capture-exclusion not achievable, online ASR failure; app falls back to best-effort local-only transcription or disabled features and surfaces clear warnings.

---

## 11. Platform-Specific Implementation Notes and Limitations

**Important:** Meeting platforms and OS capture stacks vary. Documented behavior below is a plan; each approach must be validated during testing.

### Windows (10/11)
**Techniques to explore:**
- **SetWindowDisplayAffinity:** Can mark window to exclude from screen capture for "protected content" scenarios, but typically applies to capturing APIs like PrintWindow and may not exclude all capture methods; also restricts window content such that some hardware acceleration is required. Evaluate compatibility and side effects.
- **Layered windows** with `WS_EX_LAYERED` and `WS_EX_TRANSPARENT` flags and creating a separate topmost window that is not on the same capture plane as the desktop composition; DWM/DirectComposition interactions can help.
- Use **DirectComposition** to render overlay in a separate visual that might not be included by some capture APIs.
- For app capture modes (e.g., selecting an application window), recommend users share a specific app window rather than full display to avoid overlay inclusion, if exclusion is unreliable.

**Limitations:**
- Some meeting apps capture at a lower level (screen-capture drivers or mirror drivers) that may still capture overlay.
- SetWindowDisplayAffinity has restrictions and may not apply for certain capture APIs.

### macOS
**Techniques to explore:**
- Create an `NSWindow` with appropriate level (e.g., `NSPopUpMenuWindowLevel` or higher) and set the window to non-opaque or using Core Animation layers that may be excluded from `CGDisplayStream`-based captures.
- Investigate the `CGWindowListCreateImage` or `CGDisplayStream` behavior; macOS screen capture APIs generally capture the entire screen content; however, apps that use Metal or separate layer compositing might be excluded in some cases.
- Use the **Screen Capture Kit** (macOS Ventura+, with Apple-approved APIs) to understand capture behavior and possibly mark a window as excluded—note Screen Capture Kit is for capture, not exclusion, but it's necessary to test interactions.

**Limitations:**
- macOS capture is aggressive; full display captures will usually include all windows. There may be no official API to universally exclude a window from screen capture. For macOS, the recommended fallback is explicit user guidance: prefer application window sharing rather than full-screen sharing.

### Cross-platform Fallback Strategy
- Provide "best-effort" exclusion, attempt platform-native APIs, and detect via a capture-test that shows the user whether the overlay is captured. If capture-exclusion cannot be guaranteed, provide clear guidance and recommend safe sharing workflows (e.g., share specific application window).

### Legal and Policy Caution
- Some APIs marketed as "anti-capture" or "protected content" have platform constraints (DRM contexts). Avoid misuse; ensure compliance with OS terms and meeting platform EULA.

---

## 12. Security & Privacy Requirements

- Default transcription off; explicit consent required for local/cloud transcription.
- **If cloud transcription used:**
  - Show consent screen with provider name, region, what's sent, retention policy.
  - Encrypt audio in transit (TLS 1.2+/mTLS if possible).
  - Provide optional enterprise key management for customers.
- **Local transcript storage:**
  - Encrypt transcripts in transit and at rest (AES-256).
  - Allow user to configure retention and purge.
- No transcripts or raw audio in telemetry by default. If diagnostic upload is allowed, redact PII and get explicit permission.
- **Permissions:**
  - Request microphone permission through OS dialog flow.
  - For system audio capture (if required), use platform-appropriate mechanisms and inform user about privacy implications.
- **Code signing and installer:** Sign the native helpers and app to avoid tampering warnings; recommend notarization for macOS.
- Supply a clear privacy policy and in-app settings for export/deletion of transcripts.

---

## 13. Testing, QA and Validation Plan

### Test Categories
- **Capture-exclusion tests**
  - Manual tests across Teams, Google Meet, Zoom on Windows and macOS.
  - Automated capture test harness: where possible, programmatically capture what a screen-capture API sees and compare to actual overlay pixels (privacy-safe simulated content).
- **Functional tests**
  - Overlay behavior: move, resize, always-on-top, hotkeys.
  - Transcription: accuracy tests on predefined audio samples (quiet, noisy).
  - Audio controls: ensure mute/unmute toggles mic, no audio loops.
- **Performance tests**
  - CPU/memory usage profiling with overlay idle and with active transcription.
- **Security tests**
  - Validate encryption at rest and transit, secure storage of keys.
  - Verify permission flows and that no unauthorized audio is collected.
- **Regression tests**
  - Against each supported OS version and common meeting platform versions.

### Test Cases (Examples)
- **TC-01:** Start share (display capture) in Teams with overlay visible — verify overlay pixels do not appear in captured area (pass/fail).
- **TC-02:** Start share (window capture) of a presentation app — verify overlay not included.
- **TC-03:** Enable real-time transcription — verify latency and minimal error rates for sample audio.
- **TC-04:** Deny microphone permission — app should show guidance and disable transcription.

### Automation Feasibility
- Full automation of capture-exclusion tests may be limited due to OS restrictions and meeting platform UIs; plan for a mix of automated tests (unit, integration) and manual compatibility tests.

---

## 14. Milestones and Roadmap

### Phase 0 — Research & Prototype (4 weeks)
- Research OS APIs, feasibility matrix, prototype capture-exclusion approaches on Windows and macOS.
- Prototype local transcription pipeline (Whisper/VOSK) integration.

### Phase 1 — Core Overlay + Transcription MVP (6–8 weeks)
- Implement Electron app with overlay UI and settings.
- Integrate local ASR for en-US.
- Implement audio capture and basic audio controls.
- Implement permissions/onboarding.

### Phase 2 — Platform Parity & Capture Testing (4–6 weeks)
- Harden OS-specific helpers, implement best-effort exclusion, run broad capture tests for Teams/Meet/Zoom.
- Add capture-test diagnostic tool.

### Phase 3 — Cloud Transcription & Enterprise Features (4 weeks)
- Add optional cloud ASR providers with consent flows and key management.
- Add logging, admin deployment options.

### Phase 4 — Polishing, Performance, and Compliance (3–4 weeks)
- Performance optimizations, accessibility improvements, documentation, sign and notarize installers.

**Acceptance and release:** Iterate through beta testing and fix issues required to meet success criteria.

---

## 15. Risks and Mitigation

**Risk:** No reliable universal way to exclude a window from screen capture.  
**Mitigation:** Best-effort approach + capture-test; user education to prefer application window sharing. Maintain regular compatibility testing and rapid updates.

**Risk:** Meeting platforms change capture APIs frequently.  
**Mitigation:** Modular native helper architecture; monitoring and quick patch process.

**Risk:** Privacy/legal concerns about sending audio to cloud providers.  
**Mitigation:** Default local ASR; explicit consent; enterprise controls.

**Risk:** Performance/latency issues with real-time transcription.  
**Mitigation:** Offer local vs cloud ASR options, allow adjustable transcription quality vs latency; profile and optimize audio pipeline.

**Risk:** App flagged by OS or AV as intrusive due to capture-related behaviour.  
**Mitigation:** Proper code-signing, notarization on macOS, clear privacy docs, minimal background footprint.

---

## 16. Acceptance Criteria and Success Metrics

- **Functional:** Overlay is excluded in at least 80% of tested screen-sharing scenarios across Teams/Zoom/Meet for target OS versions (document exceptions).
- **Performance:** Median transcription latency <1.5s for local model; CPU usage <10% during active transcription on representative hardware.
- **Quality:** Word error rate target specified per chosen ASR (e.g., WER <10% on clean audio if using cloud ASR).
- **Security:** All cloud paths use TLS and stored transcripts are encrypted; privacy settings available to user.
- **UX:** Onboarding and capture-test completed by beta testers with >80% success rate in excluding overlay.

---

## 17. Implementation Checklist (Developer-Focused)

- [ ] Create Electron skeleton with signed build pipeline.
- [ ] Implement overlay renderer and settings UI.
- [ ] Build native helper abstractions for Windows and macOS.
- [ ] Integrate local ASR (or provider of choice) and implement transcription UI.
- [ ] Implement audio capture and controls with safe audio routing.
- [ ] Implement capture-exclusion tests and capture-diagnostic tool.
- [ ] Implement encryption and secure storage (keychain integration).
- [ ] Add telemetry opt-in and diagnostics.
- [ ] Perform cross-platform QA and document per-platform limitations.
- [ ] Sign, notarize (macOS), and prepare installers.

---

## 18. Next Steps (Immediate)

- Run research spike to validate Windows SetWindowDisplayAffinity and DirectComposition behavior and macOS NSWindow/Screen Capture interactions (assign to platform engineer).
- Prototype local transcription with a small audio sample using Whisper or VOSK and measure latency/accuracy trade-offs.
- Draft privacy language and consent UI copy.

---

## 19. Appendix — Relevant APIs & References (Starter List)

### Windows
- SetWindowDisplayAffinity (Desktop Window Manager)
- DWM/DirectComposition docs
- Windows Audio Session API (WASAPI) for audio capture

### macOS
- NSWindow levels, Core Animation
- Screen Capture Kit (macOS 12/13+), CGDisplayStream
- AVFoundation / AudioUnit for audio capture and processing

### ASR Options
- **Local:** OpenAI Whisper (local binary), VOSK, Kaldi-based tools
- **Cloud:** Azure Speech, Google Speech-to-Text, AWS Transcribe

### Security
- OS key stores: Windows Credential Manager, macOS Keychain
- TLS best practices and mTLS

---

## 20. Contact and Stakeholders

- **Product Owner:** [TBD]
- **Engineering Lead:** [TBD]
- **Security/Compliance:** [TBD]
- **UX:** [TBD]

*(Replace [TBD] with actual names when team is assigned.)*

---

**— End of PRD —**
