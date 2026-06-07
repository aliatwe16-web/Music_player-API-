// Pulse Player uses the public iTunes Search API.
// No API key is required. If you swap to Spotify/Deezer/etc., add your API key where you build the fetch URL.
const API_BASE = 'https://itunes.apple.com/search';
const DEFAULT_QUERY = 'daft punk';

const audio = document.getElementById('audio');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const playlist = document.getElementById('playlist');
const statusBox = document.getElementById('status');
const playlistTitle = document.getElementById('playlistTitle');
const trackCount = document.getElementById('trackCount');

const cover = document.getElementById('cover');
const coverWrap = document.getElementById('coverWrap');
const songTitle = document.getElementById('songTitle');
const artistName = document.getElementById('artistName');
const albumName = document.getElementById('albumName');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const progress = document.getElementById('progress');
const volume = document.getElementById('volume');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let tracks = [];
let currentIndex = 0;
let isSeeking = false;

// Converts seconds into a friendly m:ss label.
function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

// Shows loading and error messages without crashing the player.
function setStatus(message, type = 'normal') {
  statusBox.textContent = message;
  statusBox.className = `status ${type === 'error' ? 'error' : ''}`;
}

function hideStatus() {
  statusBox.className = 'status hidden';
}

// Fetches song previews from the iTunes API by title or artist.
async function fetchTracks(query = DEFAULT_QUERY) {
  setStatus('Loading songs...');
  playlist.innerHTML = '';

  try {
    const url = `${API_BASE}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=24`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    tracks = (data.results || [])
      .filter(track => track.previewUrl)
      .map(track => ({
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName,
        cover: track.artworkUrl100.replace('100x100bb', '600x600bb'),
        preview: track.previewUrl,
        duration: Math.round((track.trackTimeMillis || 30000) / 1000)
      }));

    if (!tracks.length) {
      throw new Error('No playable previews found. Try another song or artist.');
    }

    playlistTitle.textContent = query === DEFAULT_QUERY ? 'Featured tracks' : `Results for “${query}”`;
    trackCount.textContent = `${tracks.length} songs`;
    currentIndex = 0;
    renderPlaylist();
    loadTrack(currentIndex, false);
    hideStatus();
  } catch (error) {
    tracks = [];
    trackCount.textContent = '0 songs';
    setStatus(`${error.message} Please check your connection and try again.`, 'error');
  }
}

// Renders the playlist from the latest API results.
function renderPlaylist() {
  playlist.innerHTML = tracks.map((track, index) => `
    <li>
      <button class="track ${index === currentIndex ? 'active' : ''}" data-index="${index}">
        <img src="${track.cover}" alt="${track.album} cover" loading="lazy" />
        <span>
          <span class="track-title">${track.title}</span>
          <span class="track-artist">${track.artist}</span>
        </span>
        <span class="track-duration">${formatTime(track.duration)}</span>
      </button>
    </li>
  `).join('');
}

// Loads a selected track into the audio element and updates the UI.
function loadTrack(index, shouldPlay = true) {
  if (!tracks[index]) return;

  const track = tracks[index];
  currentIndex = index;
  audio.src = track.preview;
  cover.src = track.cover;
  cover.alt = `${track.album} cover`;
  songTitle.textContent = track.title;
  artistName.textContent = track.artist;
  albumName.textContent = track.album || 'Single';
  durationEl.textContent = formatTime(track.duration);
  progress.value = 0;
  currentTimeEl.textContent = '0:00';
  renderPlaylist();

  if (shouldPlay) playTrack();
}

function playTrack() {
  audio.play().then(() => {
    playBtn.textContent = '⏸';
    coverWrap.classList.add('playing');
  }).catch(() => {
    setStatus('Playback was blocked by the browser. Tap play again to start.', 'error');
  });
}

function pauseTrack() {
  audio.pause();
  playBtn.textContent = '▶';
  coverWrap.classList.remove('playing');
}

function playNext() {
  if (!tracks.length) return;
  loadTrack((currentIndex + 1) % tracks.length);
}

function playPrevious() {
  if (!tracks.length) return;
  loadTrack((currentIndex - 1 + tracks.length) % tracks.length);
}

// Main player controls.
playBtn.addEventListener('click', () => {
  if (!audio.src && tracks.length) loadTrack(currentIndex, false);
  audio.paused ? playTrack() : pauseTrack();
});

nextBtn.addEventListener('click', playNext);
prevBtn.addEventListener('click', playPrevious);

volume.addEventListener('input', event => {
  audio.volume = Number(event.target.value);
});

// Keeps the progress bar synced with the current audio preview.
audio.addEventListener('timeupdate', () => {
  if (isSeeking || !audio.duration) return;
  progress.value = (audio.currentTime / audio.duration) * 100;
  currentTimeEl.textContent = formatTime(audio.currentTime);
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener('ended', playNext);

audio.addEventListener('pause', () => {
  playBtn.textContent = '▶';
  coverWrap.classList.remove('playing');
});

progress.addEventListener('input', () => {
  isSeeking = true;
});

progress.addEventListener('change', event => {
  if (audio.duration) {
    audio.currentTime = (Number(event.target.value) / 100) * audio.duration;
  }
  isSeeking = false;
});

playlist.addEventListener('click', event => {
  const trackButton = event.target.closest('.track');
  if (!trackButton) return;
  loadTrack(Number(trackButton.dataset.index));
});

searchForm.addEventListener('submit', event => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (query) fetchTracks(query);
});

// Initial setup.
audio.volume = Number(volume.value);
fetchTracks();
