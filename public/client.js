const socket = io();

const landing = document.getElementById('landing');
const waitingScreen = document.getElementById('waitingScreen');
const startBtn = document.getElementById('startBtn');
const localVideo = document.getElementById('localVideo');

let localStream = null;
let pc = null;

const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

startBtn.addEventListener('click', async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    alert('ক্যামেরা/মাইক্রোফোন অ্যাক্সেসের অনুমতি দিতে হবে: ' + err.message);
    return;
  }

  localVideo.srcObject = localStream;
  landing.classList.add('hidden');
  waitingScreen.classList.remove('hidden');

  socket.emit('visitor-join');
});

// Admin থেকে অফার আসলে উত্তর (answer) পাঠানো
socket.on('signal', async ({ from, data }) => {
  if (data.type === 'offer') {
    pc = new RTCPeerConnection(config);

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', { to: from, data: event.candidate });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(data));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('signal', { to: from, data: pc.localDescription });

  } else if (data.candidate) {
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data));
      } catch (e) {
        console.error('ICE candidate error:', e);
      }
    }
  }
});
