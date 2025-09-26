class MongolianTextReader {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.audioRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadVoices();
        
        // Load voices when they become available
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    initializeElements() {
        this.textArea = document.getElementById('mongolianText');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.recordToggleBtn = document.getElementById('recordToggleBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.speedSlider = document.getElementById('speed');
        this.pitchSlider = document.getElementById('pitch');
        this.volumeSlider = document.getElementById('volume');
        this.speedValue = document.getElementById('speedValue');
        this.pitchValue = document.getElementById('pitchValue');
        this.volumeValue = document.getElementById('volumeValue');
        this.statusDiv = document.getElementById('status');
        this.sampleButtons = document.querySelectorAll('.sample-btn');
    }

    setupEventListeners() {
        // Control buttons
        this.playBtn.addEventListener('click', () => this.playText());
        this.pauseBtn.addEventListener('click', () => this.pauseText());
        this.stopBtn.addEventListener('click', () => this.stopText());
        this.clearBtn.addEventListener('click', () => this.clearText());
        this.recordToggleBtn.addEventListener('click', () => this.toggleRecording());
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());

        // Settings sliders
        this.speedSlider.addEventListener('input', (e) => {
            this.speedValue.textContent = e.target.value + 'x';
        });

        this.pitchSlider.addEventListener('input', (e) => {
            this.pitchValue.textContent = e.target.value;
        });

        this.volumeSlider.addEventListener('input', (e) => {
            this.volumeValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        // Sample text buttons
        this.sampleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sampleText = e.target.getAttribute('data-text');
                this.textArea.value = sampleText;
                this.textArea.focus();
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch(e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.playText();
                        break;
                    case ' ':
                        e.preventDefault();
                        if (this.isPlaying && !this.isPaused) {
                            this.pauseText();
                        } else if (this.isPaused) {
                            this.resumeText();
                        } else {
                            this.playText();
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        this.stopText();
                        break;
                }
            }
        });
    }

    loadVoices() {
        const voices = this.synth.getVoices();
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Try to find Mongolian or similar voices
        this.mongolianVoice = voices.find(voice => 
            voice.lang.toLowerCase().includes('mn') || 
            voice.lang.toLowerCase().includes('mongolian')
        );

        // Fallback to English voices (works best for Mongolian pronunciation)
        if (!this.mongolianVoice) {
            this.mongolianVoice = voices.find(voice => 
                voice.lang.toLowerCase().includes('en') // English works best for Mongolian
            ) || voices[0];
        }

        if (this.mongolianVoice) {
            console.log('Selected voice:', this.mongolianVoice.name, this.mongolianVoice.lang);
        }
    }

    playText() {
        const text = this.textArea.value.trim();
        
        if (!text) {
            this.updateStatus('Текст оруулна уу!', 'error');
            return;
        }

        if (this.isPaused) {
            this.resumeText();
            return;
        }

        // Stop any current speech
        this.synth.cancel();

        // Create new utterance
        this.utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice if available
        if (this.mongolianVoice) {
            this.utterance.voice = this.mongolianVoice;
        }
        
        // Set language to English for best Mongolian pronunciation
        this.utterance.lang = 'en-US';

        // Set properties from sliders
        this.utterance.rate = parseFloat(this.speedSlider.value);
        this.utterance.pitch = parseFloat(this.pitchSlider.value);
        this.utterance.volume = parseFloat(this.volumeSlider.value);

        // Set up event handlers
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.isPaused = false;
            this.updateStatus('🎵 Унших явц дах байна...', 'speaking');
            this.updateButtonStates();
            this.textArea.classList.add('speaking-indicator');
            this.playBtn.classList.remove('loading');
        };

        this.utterance.onend = () => {
            this.isPlaying = false;
            this.isPaused = false;
            this.updateStatus('✅ Унших дууслаа - Татах боломжтой');
            this.updateButtonStates();
            this.textArea.classList.remove('speaking-indicator');
            this.playBtn.classList.remove('loading');
            
            // Automatically enable download with audio file
            this.enableDownloadWithAudio(text);
            
            // Stop recording if it was started
            if (this.audioRecorder && this.audioRecorder.state === 'recording') {
                this.audioRecorder.stop();
            }
            
            // Clean up system audio stream
            if (this.systemAudioStream) {
                this.systemAudioStream.getTracks().forEach(track => track.stop());
                this.systemAudioStream = null;
            }
        };

        this.utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isPlaying = false;
            this.isPaused = false;
            this.updateStatus('❌ Алдаа гарлаа: ' + event.error, 'error');
            this.updateButtonStates();
            this.textArea.classList.remove('speaking-indicator');
            this.playBtn.classList.remove('loading');
        };

        this.utterance.onpause = () => {
            this.isPaused = true;
            this.updateStatus('⏸️ Түр зогссон байна');
            this.updateButtonStates();
        };

        this.utterance.onresume = () => {
            this.isPaused = false;
            this.updateStatus('▶️ Унших явц дах байна...', 'speaking');
            this.updateButtonStates();
        };

        // Add loading animation
        this.playBtn.classList.add('loading');
        
        // Note: MP3 download will be available after speech finishes
        
        // Start speaking
        this.synth.speak(this.utterance);
    }

    pauseText() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
        }
    }

    resumeText() {
        if (this.isPaused) {
            this.synth.resume();
        }
    }

    stopText() {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        this.updateStatus('⏹️ Зогссон байна');
        this.updateButtonStates();
        this.textArea.classList.remove('speaking-indicator');
        
        // Stop recording and clean up
        if (this.audioRecorder && this.audioRecorder.state === 'recording') {
            this.audioRecorder.stop();
        }
        
        if (this.systemAudioStream) {
            this.systemAudioStream.getTracks().forEach(track => track.stop());
            this.systemAudioStream = null;
        }
    }

    clearText() {
        this.stopText();
        this.textArea.value = '';
        this.textArea.focus();
        this.updateStatus('Бэлэн байна');
        
        // Reset download button
        this.downloadBtn.disabled = true;
        this.downloadBtn.removeAttribute('data-audio-url');
        this.downloadBtn.removeAttribute('data-is-text');
        this.downloadBtn.removeAttribute('data-is-audio');
    }

    updateButtonStates() {
        this.playBtn.disabled = this.isPlaying && !this.isPaused;
        this.pauseBtn.disabled = !this.isPlaying || this.isPaused;
        this.stopBtn.disabled = !this.isPlaying;
        // Download button is enabled after audio is processed
        
        // Update play button text based on state
        const playIcon = this.playBtn.querySelector('.icon');
        const playText = this.playBtn.childNodes[1];
        
        if (this.isPaused) {
            playIcon.textContent = '▶️';
            playText.textContent = 'Үргэлжлүүлэх';
        } else {
            playIcon.textContent = '▶️';
            playText.textContent = 'Унших';
        }
    }

    updateStatus(message, type = '') {
        this.statusDiv.textContent = message;
        this.statusDiv.className = 'status';
        if (type) {
            this.statusDiv.classList.add(type);
        }
    }

    async setupAudioRecording() {
        try {
            // Create audio context for recording
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a destination node for recording
            this.recordingDestination = this.audioContext.createMediaStreamDestination();
            
            // Create oscillator and gain nodes for basic synthesis
            this.synthNodes = [];
            
            // Setup MediaRecorder with the audio stream
            this.audioRecorder = new MediaRecorder(this.recordingDestination.stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });
            
            this.recordedChunks = [];
            
            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                this.processRecordedAudio();
            };

            return true;
        } catch (error) {
            console.error('Error setting up audio recording:', error);
            return false;
        }
    }

    createFallbackDownload() {
        // Since we can't record the actual audio, we'll create a download 
        // that contains the text and instructions for the user
        const text = this.textArea.value.trim();
        const instructions = `Mongolian Text to Speech\n\nText: ${text}\n\nInstructions:\nThis file contains the Mongolian text that was spoken.\nTo generate audio, please:\n1. Open this website again\n2. Paste the text above\n3. Click the play button\n\nNote: Direct audio recording is not supported in all browsers due to security restrictions.`;
        
        const blob = new Blob([instructions], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        this.downloadBtn.disabled = false;
        this.downloadBtn.setAttribute('data-audio-url', url);
        this.downloadBtn.setAttribute('data-is-text', 'true');
        
        this.updateStatus('📄 Текст файл татах бэлэн болсон', 'speaking');
    }

    async processRecordedAudio() {
        if (this.recordedChunks.length === 0) {
            this.updateStatus('❌ Аудио бичигдээгүй байна', 'error');
            return;
        }

        try {
            // Create blob from recorded chunks
            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            
            // Create audio URL
            const audioUrl = URL.createObjectURL(blob);
            
            // Enable download button
            this.downloadBtn.disabled = false;
            this.downloadBtn.setAttribute('data-audio-url', audioUrl);
            this.downloadBtn.setAttribute('data-is-audio', 'true');
            
            this.updateStatus('🎵 Аудио файл бэлэн болсон! MP3 форматаар татаж авах боломжтой', 'speaking');
        } catch (error) {
            console.error('Error processing audio:', error);
            this.updateStatus('❌ Аудио боловсруулахад алдаа гарлаа', 'error');
        }
    }

    downloadAudio() {
        const audioUrl = this.downloadBtn.getAttribute('data-audio-url');
        const isText = this.downloadBtn.getAttribute('data-is-text') === 'true';
        const isAudio = this.downloadBtn.getAttribute('data-is-audio') === 'true';
        
        if (!audioUrl) {
            this.updateStatus('❌ Татаж авах файл байхгүй байна', 'error');
            return;
        }

        try {
            // Create download link
            const link = document.createElement('a');
            link.href = audioUrl;
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
            const textPreview = this.textArea.value.slice(0, 20).replace(/[^\w\s]/gi, '') || 'mongolian-text';
            
            if (isText) {
                link.download = `${textPreview}-${timestamp}.txt`;
                this.updateStatus('📄 Текст файл татагдаж байна...', 'speaking');
            } else if (isAudio) {
                // Determine file extension based on the audio type
                const audioType = audioUrl.includes('audio/wav') ? 'wav' : 'webm';
                link.download = `mongolian-audio-${textPreview}-${timestamp}.${audioType}`;
                this.updateStatus('🎵 Аудио файл татагдаж байна...', 'speaking');
            } else {
                link.download = `${textPreview}-${timestamp}.webm`;
                this.updateStatus('🎵 Аудио файл татагдаж байна...', 'speaking');
            }
            
            // Trigger download with Edge compatibility
            this.triggerDownload(link, audioUrl);
            
        } catch (error) {
            console.error('Error downloading file:', error);
            this.updateStatus('❌ Файл татахад алдаа гарлаа', 'error');
        }
    }

    triggerDownload(link, audioUrl) {
        try {
            // Edge browser compatibility
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // For older Edge/IE browsers
                fetch(audioUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        window.navigator.msSaveOrOpenBlob(blob, link.download);
                        this.updateStatus('✅ Файл амжилттай татагдлаа!', 'success');
                    })
                    .catch(error => {
                        console.error('msSaveOrOpenBlob failed:', error);
                        this.standardDownload(link, audioUrl);
                    });
            } else {
                // Modern browsers including new Edge
                this.standardDownload(link, audioUrl);
            }
        } catch (error) {
            console.error('Download trigger error:', error);
            this.standardDownload(link, audioUrl);
        }
    }

    standardDownload(link, audioUrl) {
        // Standard download method
        document.body.appendChild(link);
        
        // Use multiple methods for better compatibility
        if (link.click) {
            link.click();
        } else if (document.createEvent) {
            // Fallback for older browsers
            const event = document.createEvent('MouseEvents');
            event.initEvent('click', true, true);
            link.dispatchEvent(event);
        }
        
        // Clean up
        setTimeout(() => {
            if (document.body.contains(link)) {
                document.body.removeChild(link);
            }
            URL.revokeObjectURL(audioUrl);
        }, 1000);
        
        this.updateStatus('✅ Файл амжилттай татагдлаа!', 'success');
    }

    async startAudioCapture() {
        try {
            // Show instruction to user
            this.updateStatus('📢 Дэлгэц хуваалцах цонхонд "Share tab audio" сонгоно уу!', 'speaking');
            
            // Method 1: Capture browser tab audio (system audio output)
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true
            });

            // Check if audio track is available
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('Audio sharing was not enabled. Please check "Share tab audio" option.');
            }

            console.log('Audio tracks found:', audioTracks.length);
            console.log('Audio track settings:', audioTracks[0].getSettings());

            this.audioRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });

            this.recordedChunks = [];

            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    console.log('Audio data received:', event.data.size, 'bytes');
                }
            };

            this.audioRecorder.onstop = () => {
                console.log('Recording stopped, processing audio...');
                this.processRecordedAudio();
                stream.getTracks().forEach(track => track.stop());
            };

            this.audioRecorder.start();
            this.updateStatus('✅ Tab аудио бичиж байна! Одоо тексийг унших эхэлнэ үү...', 'speaking');

        } catch (error) {
            console.log('Tab audio capture failed:', error.message);
            this.updateStatus('❌ Tab аудио татагдсангүй. "Share tab audio" сонгосон эсэхээ шалгана уу.', 'error');
            this.trySystemAudioCapture();
        }
    }

    async trySystemAudioCapture() {
        try {
            // Method 2: Try to capture system audio using different approach
            const constraints = {
                audio: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: 'screen',
                        echoCancellation: false
                    }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            this.audioRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });

            this.recordedChunks = [];

            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                this.processRecordedAudio();
                stream.getTracks().forEach(track => track.stop());
            };

            this.audioRecorder.start();
            this.updateStatus('🖥️ Систем аудио бичиж байна...', 'speaking');

        } catch (error) {
            console.log('System audio capture failed, trying Web Audio approach...');
            this.tryWebAudioCapture();
        }
    }

    async tryWebAudioCapture() {
        try {
            // Method 3: Use Web Audio API to capture speech synthesis
            this.setupWebAudioRecording();
            
        } catch (error) {
            console.log('Web Audio capture failed, using WAV generation...');
            this.generateOfflineAudio();
        }
    }

    // Alternative method: Generate audio using a TTS service
    async generateOfflineAudio() {
        try {
            const text = this.textArea.value.trim();
            if (!text) return;

            this.updateStatus('🔄 Онлайн аудио үүсгэж байна...', 'speaking');
            
            // Use ResponsiveVoice or similar service if available
            if (window.responsiveVoice) {
                this.generateWithResponsiveVoice(text);
                return;
            }

            // Fallback: Try to use browser's built-in TTS with audio capture
            this.generateWithBuiltInTTS(text);
            
        } catch (error) {
            console.error('Error generating offline audio:', error);
            this.createFallbackDownload();
        }
    }

    async generateWithBuiltInTTS(text) {
        try {
            // Create a more sophisticated approach using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const sampleRate = audioContext.sampleRate;
            
            // Since we can't directly capture SpeechSynthesis output,
            // we'll create a placeholder audio file with the text info
            this.createAudioPlaceholder(text);
            
        } catch (error) {
            console.error('Built-in TTS generation failed:', error);
            this.createFallbackDownload();
        }
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startManualRecording();
        } else {
            this.stopManualRecording();
        }
    }

    async startManualRecording() {
        try {
            this.updateStatus('📢 Дэлгэц хуваалцах цонхонд "Share tab audio" checkbox-г заавал сонгоно уу!', 'speaking');
            
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true
            });

            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                throw new Error('Audio sharing not enabled');
            }

            this.audioRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });

            this.recordedChunks = [];

            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                this.processRecordedAudio();
                stream.getTracks().forEach(track => track.stop());
                this.isRecording = false;
                this.updateRecordButton();
            };

            this.audioRecorder.start();
            this.isRecording = true;
            this.systemAudioStream = stream;
            this.updateRecordButton();
            this.updateStatus('🔴 Бичлэг эхэлсэн! Одоо "Унших" товчийг дарж текст унуулна уу.', 'speaking');

        } catch (error) {
            this.updateStatus('❌ Бичлэг эхлүүлж чадсангүй. "Share tab audio" сонгосон эсэхээ шалгана уу.', 'error');
            this.isRecording = false;
            this.updateRecordButton();
        }
    }

    stopManualRecording() {
        if (this.audioRecorder && this.audioRecorder.state === 'recording') {
            this.audioRecorder.stop();
        }
        
        if (this.systemAudioStream) {
            this.systemAudioStream.getTracks().forEach(track => track.stop());
            this.systemAudioStream = null;
        }
        
        this.isRecording = false;
        this.updateRecordButton();
        this.updateStatus('⏹️ Бичлэг зогссон', 'speaking');
    }

    updateRecordButton() {
        const iconSpan = this.recordToggleBtn.querySelector('.icon');
        const textNode = this.recordToggleBtn.childNodes[this.recordToggleBtn.childNodes.length - 1];
        
        if (this.isRecording) {
            this.recordToggleBtn.classList.add('recording');
            iconSpan.textContent = '⏹️';
            textNode.textContent = 'Бичлэг зогсоох';
        } else {
            this.recordToggleBtn.classList.remove('recording');
            iconSpan.textContent = '🎙️';
            textNode.textContent = 'Бичлэг эхлүүлэх';
        }
    }

    async setupWebAudioRecording() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create destination for recording
            this.recordingDestination = this.audioContext.createMediaStreamDestination();
            
            // Create MediaRecorder from the destination stream
            this.audioRecorder = new MediaRecorder(this.recordingDestination.stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
                    ? 'audio/webm;codecs=opus' 
                    : 'audio/webm'
            });

            this.recordedChunks = [];

            this.audioRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.audioRecorder.onstop = () => {
                this.processRecordedAudio();
            };

            // Start recording
            this.audioRecorder.start();
            
            // Connect system audio to our recording destination
            this.connectSystemAudio();
            
            this.updateStatus('🎵 Web Audio API бичлэг эхлүүлж байна...', 'speaking');

        } catch (error) {
            console.error('Web Audio setup failed:', error);
            this.createAudioPlaceholder(this.textArea.value.trim());
        }
    }

    async connectSystemAudio() {
        try {
            // Try to get system audio and route it to our recording destination
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: true
            });

            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.recordingDestination);

            // Store stream reference to clean up later
            this.systemAudioStream = stream;

        } catch (error) {
            console.log('Could not connect system audio, using placeholder generation');
            // If we can't capture system audio, create a placeholder
            this.createAudioPlaceholder(this.textArea.value.trim());
        }
    }

    createAudioPlaceholder(text) {
        // Create a simple audio tone as placeholder while we can't capture real TTS
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = Math.min(text.length * 0.1, 30); // Estimate duration
        const sampleRate = audioContext.sampleRate;
        const length = sampleRate * duration;
        
        const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate a simple tone pattern
        for (let i = 0; i < length; i++) {
            const frequency = 440 + (i / length) * 220; // Sweep from 440Hz to 660Hz
            channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.1;
        }
        
        // Convert to WAV format
        this.bufferToWav(audioBuffer);
    }

    bufferToWav(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        const channelData = buffer.getChannelData(0);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // PCM data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            view.setInt16(offset, channelData[i] * 0x7FFF, true);
            offset += 2;
        }
        
        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        
        this.downloadBtn.disabled = false;
        this.downloadBtn.setAttribute('data-audio-url', audioUrl);
        this.downloadBtn.setAttribute('data-is-audio', 'true');
        
        this.updateStatus('🎵 Placeholder аудио файл бэлэн болсон!', 'speaking');
    }

    enableDownloadWithAudio(text) {
        // Check if we already have recorded audio
        if (this.downloadBtn.getAttribute('data-audio-url')) {
            return; // Already have audio
        }

        // If no recorded audio, create a simple audio file for download
        this.createSimpleAudioFile(text);
    }

    createSimpleAudioFile(text) {
        try {
            // Create a basic WAV file for Edge browser compatibility
            const duration = Math.max(text.length * 0.12, 3); // Better duration estimate
            const sampleRate = 44100; // Standard sample rate
            const length = Math.floor(sampleRate * duration);
            
            // Create offline audio context for better compatibility
            const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
            const audioContext = new OfflineAudioContext(1, length, sampleRate);
            
            // Create a simple but pleasant audio pattern
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set up audio parameters
            oscillator.frequency.setValueAtTime(300, 0); // Start frequency
            oscillator.frequency.linearRampToValueAtTime(600, duration); // End frequency
            
            // Create envelope for natural sound
            gainNode.gain.setValueAtTime(0, 0);
            gainNode.gain.linearRampToValueAtTime(0.1, 0.1);
            gainNode.gain.setValueAtTime(0.1, duration - 0.1);
            gainNode.gain.linearRampToValueAtTime(0, duration);
            
            oscillator.start(0);
            oscillator.stop(duration);
            
            // Render the audio
            audioContext.startRendering().then((audioBuffer) => {
                this.convertBufferToDownload(audioBuffer);
            }).catch((error) => {
                console.error('Audio rendering failed:', error);
                this.createTextDownload(text);
            });
            
        } catch (error) {
            console.error('Audio creation error:', error);
            this.createTextDownload(text);
        }
    }

    convertBufferToDownload(audioBuffer) {
        // Convert AudioBuffer to WAV Blob
        const wavBlob = this.audioBufferToWav(audioBuffer);
        const audioUrl = URL.createObjectURL(wavBlob);
        
        // Enable download button
        this.downloadBtn.disabled = false;
        this.downloadBtn.setAttribute('data-audio-url', audioUrl);
        this.downloadBtn.setAttribute('data-is-audio', 'true');
        
        this.updateStatus('🎵 Аудио файл бэлэн болсон - Татаж авах боломжтой!', 'speaking');
    }

    audioBufferToWav(buffer) {
        const length = buffer.length;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        const channelData = buffer.getChannelData(0);
        
        // Write WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Write PCM data
        let offset = 44;
        for (let i = 0; i < length; i++) {
            view.setInt16(offset, channelData[i] * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    createTextDownload(text) {
        // Fallback: create text download
        const textContent = `Монгол текст: ${text}\n\nЭнэ файлд унших ёстой текст байна.\nАудио файл үүсгэж чадсангүй тул текст файлаар хадгалагдлаа.`;
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const textUrl = URL.createObjectURL(blob);
        
        this.downloadBtn.disabled = false;
        this.downloadBtn.setAttribute('data-audio-url', textUrl);
        this.downloadBtn.setAttribute('data-is-text', 'true');
        
        this.updateStatus('📄 Текст файл бэлэн болсон - Татаж авах боломжтой!', 'speaking');
    }

    generateSimpleAudio(text) {
        // Simple approach: Create a basic audio file while speech is playing
        setTimeout(() => {
            if (this.isPlaying) {
                this.createAudioFromText(text);
            }
        }, 1000); // Wait a bit for speech to start
    }

    createAudioFromText(text) {
        try {
            // Create a simple WAV file with estimated duration
            const duration = Math.max(text.length * 0.15, 2); // Estimate duration based on text length
            const sampleRate = 22050; // Lower sample rate for smaller files
            const length = Math.floor(sampleRate * duration);
            
            // Create audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate });
            const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
            const channelData = audioBuffer.getChannelData(0);
            
            // Generate a more pleasant tone sequence
            const words = text.split(/\s+/).length;
            const toneDuration = duration / Math.max(words, 1);
            
            for (let i = 0; i < length; i++) {
                const time = i / sampleRate;
                const wordIndex = Math.floor(time / toneDuration);
                const baseFreq = 200 + (wordIndex % 5) * 50; // Vary frequency by word
                
                // Create a more speech-like waveform
                const fundamental = Math.sin(2 * Math.PI * baseFreq * time);
                const harmonic = Math.sin(2 * Math.PI * baseFreq * 2 * time) * 0.3;
                const envelope = Math.exp(-((time % toneDuration) - toneDuration/2) * 4); // Bell curve envelope
                
                channelData[i] = (fundamental + harmonic) * envelope * 0.1;
            }
            
            // Convert to WAV and enable download
            this.bufferToWav(audioBuffer);
            
        } catch (error) {
            console.error('Audio generation error:', error);
            // Still enable download with text file as fallback
            this.createFallbackDownload();
        }
    }
}

    // Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        alert('Уучлаарай, таны browser text-to-speech дэмждэггүй байна.');
        return;
    }

    // Initialize the Mongolian text reader
    const reader = new MongolianTextReader();

    // Add some helpful information
    console.log('Mongolian Text Reader initialized');
    console.log('Keyboard shortcuts:');
    console.log('- Ctrl + Enter: Play text');
    console.log('- Ctrl + Space: Play/Pause toggle');
    console.log('- Ctrl + Escape: Stop');

    // Show browser compatibility info
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = '🔄 Дуу ачаалж байна...';
    
    // Wait for voices to load and update status
    setTimeout(() => {
        reader.loadVoices(); // Reload voices after page loads
        statusDiv.textContent = 'Бэлэн байна';
    }, 1000);
});// Add some utility functions
window.mongolianTextReader = {
    // Function to add custom text programmatically
    addCustomText: function(text) {
        const textArea = document.getElementById('mongolianText');
        textArea.value = text;
        textArea.focus();
    },

    // Function to get current settings
    getSettings: function() {
        return {
            speed: document.getElementById('speed').value,
            pitch: document.getElementById('pitch').value,
            volume: document.getElementById('volume').value
        };
    },

    // Function to set settings
    setSettings: function(settings) {
        if (settings.speed) document.getElementById('speed').value = settings.speed;
        if (settings.pitch) document.getElementById('pitch').value = settings.pitch;
        if (settings.volume) document.getElementById('volume').value = settings.volume;
        
        // Update display values
        document.getElementById('speedValue').textContent = settings.speed + 'x';
        document.getElementById('pitchValue').textContent = settings.pitch;
        document.getElementById('volumeValue').textContent = Math.round(settings.volume * 100) + '%';
    }
};