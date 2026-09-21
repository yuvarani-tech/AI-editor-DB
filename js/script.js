document.addEventListener('DOMContentLoaded', () => {
    // Determine current page by checking for unique elements
    const isEditor = document.getElementById('editor') !== null;
    const isSettings = document.getElementById('saveSettingsBtn') !== null;
    const isHistory = document.getElementById('historyContainer') !== null;

    // Common Elements
    const toast = document.getElementById('toast');

    // --- Common Functions ---
    function showToast(message, duration = 3000) {
        if(!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }

    async function fetchSettings() {
        try {
            const res = await fetch('php/get_settings.php');
            const data = await res.json();
            if (data.status === 'success') {
                return data.settings;
            }
        } catch (e) {
            console.error('Could not fetch settings', e);
        }
        return null;
    }

    function applySettings(settings) {
        if (!settings) return;

        // Apply theme
        document.body.classList.remove('light-mode', 'neon-mode');
        if (settings.theme === 'light') document.body.classList.add('light-mode');
        if (settings.theme === 'neon') document.body.classList.add('neon-mode');

        // Apply font
        document.documentElement.style.setProperty('--font-family', settings.font_family);
        document.documentElement.style.setProperty('--font-size', `${settings.font_size}px`);

        // Apply Background sound setting (handled by audio element)
        const bgSound = localStorage.getItem('bgSound') || 'none';
        const bgSoundVolume = localStorage.getItem('bgSoundVolume') || '50';
        window.applyBackgroundSound(bgSound, bgSoundVolume);
    }

    // Background sound audio element
    let bgAudio = new Audio();
    bgAudio.loop = true;

    window.applyBackgroundSound = function(sound, volume) {
        if (sound === 'none' || !sound) {
            bgAudio.pause();
            return;
        }

        const soundMap = {
            'rain': 'https://cdn.freesound.org/previews/538/538874_12151624-lq.mp3', // Relaxing rain
            'cafe': 'https://cdn.freesound.org/previews/143/143162_2415175-lq.mp3', // Coffee shop
            'ocean': 'https://cdn.freesound.org/previews/404/404329_7169199-lq.mp3' // Ocean waves
        };

        if (soundMap[sound]) {
            if (bgAudio.src !== soundMap[sound]) {
                bgAudio.src = soundMap[sound];
            }
            bgAudio.volume = volume / 100;
            // Only play if we're in editor
            const isEditor = document.getElementById('editor') !== null;
            if (isEditor) {
                bgAudio.play().catch(e => console.log('Audio autoplay prevented:', e));
            } else {
                bgAudio.pause();
            }
        } else {
            bgAudio.pause();
        }
    };

    // Initialize Settings globally
    fetchSettings().then(applySettings);

    // ==========================================
    // EDITOR PAGE LOGIC
    // ==========================================
    if (isEditor) {
        const editor = document.getElementById('editor');
        const wordCount = document.getElementById('wordCount');
        const charCount = document.getElementById('charCount');
        const statusIndicator = document.getElementById('statusIndicator');
        const statusText = document.querySelector('.status-text');
        
        const noteTitle = document.getElementById('noteTitle');
        const dbSaveBtn = document.getElementById('dbSaveBtn');

        const micBtn = document.getElementById('micBtn');
        const readBtn = document.getElementById('readBtn');
        const stopReadBtn = document.getElementById('stopReadBtn');
        const copyBtn = document.getElementById('copyBtn');
        const clearBtn = document.getElementById('clearBtn');
        const saveTxtBtn = document.getElementById('saveTxtBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const textColorPicker = document.getElementById('textColorPicker');

        let isRecording = false;
        let recognition = null;
        let synth = window.speechSynthesis;
        let voices = [];
        let globalSettings = {};

        // Load Note from History if exists
        const noteToLoad = localStorage.getItem('loadNoteContent');
        const titleToLoad = localStorage.getItem('loadNoteTitle');
        if (noteToLoad) {
            editor.value = noteToLoad;
            if(titleToLoad) noteTitle.value = titleToLoad;
            localStorage.removeItem('loadNoteContent');
            localStorage.removeItem('loadNoteTitle');
        }

        // Fetch settings specifically for voice config
        fetchSettings().then(s => {
            if(s) globalSettings = s;
        });

        // --- Word Counts ---
        function updateCounts() {
            const text = editor.value;
            charCount.textContent = `${text.length} characters`;
            const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
            wordCount.textContent = `${words} words`;
        }
        editor.addEventListener('input', updateCounts);
        updateCounts();

        // --- Speech Recognition ---
        function initSpeechRecognition() {
            window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!window.SpeechRecognition) {
                showToast('Speech API not supported in this browser.');
                micBtn.disabled = true;
                return;
            }

            recognition = new window.SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            
            // Set language from settings if available
            setTimeout(() => {
                if(globalSettings.language) recognition.lang = globalSettings.language;
            }, 500);

            recognition.onstart = () => {
                isRecording = true;
                micBtn.classList.add('recording');
                micBtn.querySelector('span').textContent = 'Stop Dictating';
                statusIndicator.classList.add('listening');
                statusText.textContent = 'Listening...';
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' ';
                    else interimTranscript += event.results[i][0].transcript;
                }

                if (finalTranscript !== '') {
                    const cursorPosition = editor.selectionStart;
                    const textBefore = editor.value.substring(0, cursorPosition);
                    const textAfter = editor.value.substring(cursorPosition);
                    const prependSpace = (textBefore.length > 0 && !textBefore.endsWith(' ') && !textBefore.endsWith('\n')) ? ' ' : '';
                    
                    editor.value = textBefore + prependSpace + finalTranscript + textAfter;
                    const newPos = cursorPosition + prependSpace.length + finalTranscript.length;
                    editor.selectionStart = newPos;
                    editor.selectionEnd = newPos;
                    updateCounts();
                }
            };

            recognition.onerror = (e) => {
                showToast(`Microphone error: ${e.error}`);
                stopRecording();
            };

            recognition.onend = () => {
                if (isRecording) recognition.start();
                else stopRecordingUI();
            };
        }

        function stopRecordingUI() {
            isRecording = false;
            micBtn.classList.remove('recording');
            micBtn.querySelector('span').textContent = 'Dictate';
            statusIndicator.classList.remove('listening');
            statusText.textContent = 'Ready';
        }

        function stopRecording() {
            if (recognition) {
                isRecording = false;
                recognition.stop();
                stopRecordingUI();
            }
        }

        micBtn.addEventListener('click', () => {
            if (isRecording) stopRecording();
            else {
                if (recognition) {
                    try { recognition.start(); } 
                    catch(e) { stopRecording(); setTimeout(() => recognition.start(), 100); }
                }
            }
        });

        initSpeechRecognition();

        // --- Text To Speech ---
        function populateVoices() {
            voices = synth.getVoices();
        }
        populateVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }

        readBtn.addEventListener('click', () => {
            if (synth.speaking) return;
            const textToRead = editor.value;
            if (textToRead !== '') {
                const utterThis = new SpeechSynthesisUtterance(textToRead);
                
                // Match language setting to voice
                const targetLang = globalSettings.language || 'en-US';
                const matchedVoice = voices.find(v => v.lang.startsWith(targetLang.split('-')[0])) || voices[0];
                if(matchedVoice) utterThis.voice = matchedVoice;
                
                utterThis.rate = globalSettings.voice_speed ? parseFloat(globalSettings.voice_speed) : 1.0;

                utterThis.onstart = () => {
                    readBtn.style.display = 'none';
                    stopReadBtn.style.display = 'inline-flex';
                    statusText.textContent = 'Speaking...';
                };
                utterThis.onend = () => {
                    readBtn.style.display = 'inline-flex';
                    stopReadBtn.style.display = 'none';
                    if(!isRecording) statusText.textContent = 'Ready';
                };
                utterThis.onerror = () => {
                    readBtn.style.display = 'inline-flex';
                    stopReadBtn.style.display = 'none';
                    if(!isRecording) statusText.textContent = 'Ready';
                };
                synth.speak(utterThis);
            } else {
                showToast('No text to read!');
            }
        });

        stopReadBtn.addEventListener('click', () => {
            if (synth.speaking) {
                synth.cancel();
                readBtn.style.display = 'inline-flex';
                stopReadBtn.style.display = 'none';
                if(!isRecording) statusText.textContent = 'Ready';
            }
        });

        // --- Editor Tools ---
        textColorPicker.addEventListener('input', (e) => {
            editor.style.color = e.target.value;
        });

        copyBtn.addEventListener('click', () => {
            if (!editor.value) return showToast('Nothing to copy!');
            navigator.clipboard.writeText(editor.value).then(() => showToast('Copied to clipboard!'));
        });

        clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all text?')) {
                editor.value = '';
                noteTitle.value = '';
                updateCounts();
                showToast('Text cleared.');
            }
        });

        // --- Database Save ---
        dbSaveBtn.addEventListener('click', async () => {
            const title = noteTitle.value.trim() || 'Untitled Document';
            const content = editor.value.trim();

            if(!content) return showToast('Cannot save an empty note!');

            dbSaveBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i><span>Saving...</span>';

            try {
                const response = await fetch('php/save_note.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content })
                });
                const result = await response.json();
                
                if(result.status === 'success') {
                    showToast('Note saved to cloud successfully!');
                } else {
                    showToast('Error saving note: ' + result.message);
                }
            } catch(error) {
                showToast('Network error while saving note.');
            } finally {
                dbSaveBtn.innerHTML = '<i class="ph ph-cloud-check"></i><span>Save Note</span>';
            }
        });

        // --- File Export ---
        saveTxtBtn.addEventListener('click', () => {
            const text = editor.value;
            if (!text) return showToast('Nothing to export!');
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${noteTitle.value || 'Document'}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Saved as TXT!');
        });

        exportPdfBtn.addEventListener('click', () => {
            const text = editor.value;
            if (!text) return showToast('Nothing to export!');
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text(noteTitle.value || "AI Voice Text Editor Document", 10, 20);
                doc.setFontSize(12);
                const splitText = doc.splitTextToSize(text, 180);
                doc.text(splitText, 10, 30);
                doc.save(`${noteTitle.value || 'Document'}.pdf`);
                showToast('Exported as PDF!');
            } catch (error) {
                showToast('Failed to export PDF. Ensure jsPDF is loaded.');
            }
        });
    }

    // ==========================================
    // HISTORY PAGE LOGIC
    // ==========================================
    if (isHistory) {
        const historyContainer = document.getElementById('historyContainer');

        async function loadHistory() {
            try {
                const res = await fetch('php/get_notes.php');
                const data = await res.json();
                
                if(data.status === 'success') {
                    if(data.notes.length === 0) {
                        historyContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.7;">No saved notes found. Start writing!</p>';
                        return;
                    }

                    historyContainer.innerHTML = '';
                    data.notes.forEach(note => {
                        const card = document.createElement('a');
                        card.href = "javascript:void(0)";
                        card.className = 'history-card';
                        
                        const date = new Date(note.created_at).toLocaleString();
                        
                        card.innerHTML = `
                            <h3>${escapeHTML(note.title)}</h3>
                            <div class="history-date">${date}</div>
                            <div class="history-preview">${escapeHTML(note.content)}</div>
                        `;

                        card.addEventListener('click', () => {
                            localStorage.setItem('loadNoteContent', note.content);
                            localStorage.setItem('loadNoteTitle', note.title);
                            window.location.href = 'editor.html';
                        });

                        historyContainer.appendChild(card);
                    });
                } else {
                    historyContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Error loading notes: ${data.message}</p>`;
                }
            } catch(e) {
                historyContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Network error while loading notes.</p>';
            }
        }

        loadHistory();
    }

    // ==========================================
    // SETTINGS PAGE LOGIC
    // ==========================================
    if (isSettings) {
        const themeSelect = document.getElementById('themeSelect');
        const bgSoundSelect = document.getElementById('bgSound');
        const bgSoundVolume = document.getElementById('bgSoundVolume');
        const soundVolumeDisplay = document.getElementById('soundVolumeDisplay');
        const fontFamily = document.getElementById('fontFamily');
        const fontSize = document.getElementById('fontSize');
        const fontSizeDisplay = document.getElementById('fontSizeDisplay');
        const languageSelect = document.getElementById('languageSelect');
        const voiceSpeed = document.getElementById('voiceSpeed');
        const voiceSpeedDisplay = document.getElementById('voiceSpeedDisplay');
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');

        // Populate forms
        fetchSettings().then(settings => {
            if(settings) {
                themeSelect.value = settings.theme || 'dark';
                fontFamily.value = settings.font_family || "'Inter', sans-serif";
                fontSize.value = settings.font_size || 16;
                fontSizeDisplay.textContent = `${fontSize.value}px`;
                languageSelect.value = settings.language || 'en-US';
                voiceSpeed.value = settings.voice_speed || 1.0;
                voiceSpeedDisplay.textContent = `${parseFloat(voiceSpeed.value).toFixed(1)}`;
            }
        });

        // Load local storage items
        bgSoundSelect.value = localStorage.getItem('bgSound') || 'none';
        bgSoundVolume.value = localStorage.getItem('bgSoundVolume') || '50';
        soundVolumeDisplay.textContent = `${bgSoundVolume.value}%`;

        // Real-time UI updates
        bgSoundVolume.addEventListener('input', (e) => {
            soundVolumeDisplay.textContent = `${e.target.value}%`;
            window.applyBackgroundSound(bgSoundSelect.value, e.target.value);
        });

        bgSoundSelect.addEventListener('change', (e) => {
            window.applyBackgroundSound(e.target.value, bgSoundVolume.value);
        });

        // Real-time UI updates
        fontSize.addEventListener('input', (e) => {
            fontSizeDisplay.textContent = `${e.target.value}px`;
        });

        voiceSpeed.addEventListener('input', (e) => {
            voiceSpeedDisplay.textContent = `${parseFloat(e.target.value).toFixed(1)}`;
        });

        saveSettingsBtn.addEventListener('click', async () => {
            const newSettings = {
                theme: themeSelect.value,
                font_family: fontFamily.value,
                font_size: parseInt(fontSize.value),
                language: languageSelect.value,
                voice_speed: parseFloat(voiceSpeed.value)
            };

            localStorage.setItem('bgSound', bgSoundSelect.value);
            localStorage.setItem('bgSoundVolume', bgSoundVolume.value);
            window.applyBackgroundSound(bgSoundSelect.value, bgSoundVolume.value);

            saveSettingsBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i><span>Saving...</span>';

            try {
                const res = await fetch('php/update_settings.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(newSettings)
                });
                const data = await res.json();
                
                if(data.status === 'success') {
                    showToast('Settings saved successfully!');
                    applySettings(newSettings);
                } else {
                    showToast('Failed to save settings: ' + data.message);
                }
            } catch(e) {
                showToast('Network error while saving settings.');
            } finally {
                saveSettingsBtn.innerHTML = '<i class="ph ph-floppy-disk"></i><span>Save Changes</span>';
            }
        });
    }

    // Utility
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
});
