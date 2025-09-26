# 🇲🇳 Mongolian Text Reader with Google Bataa Voice

A clean, optimized web application for reading Mongolian text aloud using Google Bataa voice with cross-browser compatibility and downloadable audio recording.

## ✨ Features

### 🎤 Voice Technology

- **Google Bataa Voice Priority**: Automatically detects and uses Google Bataa (Mongolian male voice)
- **Smart Fallback**: Falls back to other Mongolian voices or Google voices if Bataa unavailable
- **Cross-browser Compatibility**: Works on Chrome, Edge, Firefox, Safari

### 🎵 Audio Features

- **Real-time Recording**: Records audio while speech synthesis is playing
- **Multiple Format Support**: Supports WebM, WAV, MP4 audio formats
- **Automatic Download**: Audio becomes downloadable after speech completes
- **High Quality**: 44.1kHz sample rate with noise suppression

### 🎛️ Controls

- **Play/Pause/Stop**: Full playback control
- **Speed Control**: 0.7x - 1.3x playback speed
- **Pitch Control**: 0.9x - 1.2x pitch adjustment
- **Volume Control**: 0% - 100% volume
- **Keyboard Shortcuts**: Ctrl+Enter (play), Ctrl+Space (pause), Ctrl+Esc (stop)

### 📱 User Experience

- **Modern UI**: Glassmorphism design with animations
- **Responsive**: Works on desktop, tablet, mobile
- **Sample Texts**: Pre-loaded Mongolian text examples
- **Real-time Status**: Live updates on voice synthesis and recording status

## 🔧 Technical Implementation

### Voice Selection Logic

```javascript
1. Google Bataa (exact name match) - PRIORITY 1
2. Google + Mongolian language voices - PRIORITY 2
3. Any Mongolian language voice - PRIORITY 3
4. Any Google voice - PRIORITY 4
5. System default voice - PRIORITY 5
```

### Recording Workflow

```javascript
1. User clicks "Play" button
2. Speech synthesis starts
3. Audio recording starts automatically
4. Both speech and recording run simultaneously
5. When speech ends, recording stops
6. Audio file becomes available for download
7. User can download the recorded audio
```

### Browser Compatibility

- **Chrome**: Full support including Google Bataa voice
- **Edge**: Full support with Microsoft voices as fallback
- **Firefox**: Basic support with system voices
- **Safari**: Basic support with macOS voices

## 🚀 Usage

### Basic Usage

1. Open `index.html` in any modern browser
2. Enter Mongolian text in the textarea
3. Click "▶️ Унших" (Play) button
4. Audio will be automatically recorded
5. Click "💾 Татах" (Download) button when available

### Keyboard Shortcuts

- **Ctrl + Enter**: Start reading text
- **Ctrl + Space**: Pause/Resume reading
- **Ctrl + Escape**: Stop reading
- **Sample buttons**: Click to load example texts

### Sample Texts Included

- Traditional Mongolian greetings
- Common phrases and expressions
- Numbers and family terms
- Poetry and cultural text

## 📁 File Structure

```
mongolian-text-speech/
├── index.html          # Main HTML interface
├── script.js           # Clean optimized JavaScript
├── style.css           # Modern CSS with glassmorphism
├── package.json        # Project configuration
├── vercel.json         # Deployment configuration
├── README.md           # This documentation
└── script_old.js       # Backup of previous version
```

## 🔍 Code Quality Features

### Clean Architecture

- **Single Class Design**: `MongolianTextReader` handles all functionality
- **Async/Await**: Modern JavaScript with proper error handling
- **Event-driven**: Proper event listeners and cleanup
- **Memory Management**: Automatic cleanup of audio streams and URLs

### Error Handling

- **Voice Loading**: Graceful fallback if Google Bataa unavailable
- **Recording Errors**: Fallback audio generation if recording fails
- **Browser Compatibility**: Feature detection and polyfills
- **User Feedback**: Clear status messages for all operations

### Performance Optimizations

- **Efficient Voice Loading**: Single async voice detection
- **Audio Context Management**: Proper creation and cleanup
- **Memory Cleanup**: Automatic URL.revokeObjectURL() calls
- **Debounced Recording**: Optimized recording chunk collection

## 🌍 Deployment

### GitHub Pages

The project is automatically deployed to GitHub Pages at:
`https://baljir0901.github.io/mongolian-text-speech/`

### Vercel

Also available on Vercel with optimized static hosting:
`https://mongolian-text-speech.vercel.app/`

### Local Development

Simply open `index.html` in any modern browser - no build process required!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple browsers
5. Submit a pull request

## 📄 License

MIT License - feel free to use and modify for your projects!

## 🙏 Acknowledgments

- Google for providing Bataa voice in Chrome browser
- Web Speech API for speech synthesis capabilities
- MediaRecorder API for audio recording functionality
- Modern CSS features for beautiful UI design

---

**Created with ❤️ for the Mongolian language community**
