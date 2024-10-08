import React, { useState, useRef, useEffect, useCallback } from 'react';
import fixWebmDuration from 'webm-duration-fix';
import './App.css';

const App = () => {
  const words = [
    'Algorithm', 'Blockchain', 'Compression', 'Database', 'Encryption',
    'Framework', 'Gateway', 'Hyperlink', 'Interface', 'Kernel'
  ];

  const [state, setState] = useState('default'); // 'default', 'ideation', 'recording', 'download'
  const [selectedWords, setSelectedWords] = useState([]);
  const [countdown, setCountdown] = useState(null); // Countdown state
  const videoRef = useRef();
  const canvasRef = useRef();
  const mediaRecorderRef = useRef();
  const recordedChunks = useRef([]);
  const recordingStartRef = useRef(); // To store recording start time

  const getRandomWords = () => {
    const firstIndex = Math.floor(Math.random() * words.length);
    let secondIndex;
    do {
      secondIndex = Math.floor(Math.random() * words.length);
    } while (secondIndex === firstIndex);
    setSelectedWords([words[firstIndex], words[secondIndex]]);
  };

  const handleButtonClick = () => {
    switch (state) {
      case 'default':
        setState('ideation');
        getRandomWords();
        break;
      case 'ideation':
        startCountdown();
        break;
      case 'recording':
        stopRecording();
        break;
      case 'download':
        downloadVideo();
        resetState();
        break;
      default:
        break;
    }
  };

  const resetState = () => {
    setSelectedWords([]);
    setState('default');
    setCountdown(null);
  };

  const startVideoPreview = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoRef.current.srcObject = stream;
    videoRef.current.play();

    const drawOnCanvas = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const ctx = canvas.getContext('2d');

        // Calculate the center crop for 9:16 aspect ratio
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        // Center cropping
        const cropHeight = Math.min(videoHeight, videoWidth * (16 / 9));
        const cropWidth = cropHeight * (9 / 16);
        const cropX = (videoWidth - cropWidth) / 2;
        const cropY = (videoHeight - cropHeight) / 2;

        ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, canvasWidth, canvasHeight);

        // Draw words
        if (selectedWords.length > 1) {
          ctx.font = '24px "Arial"';
          ctx.fillStyle = 'black';
          ctx.fillRect(10, canvasHeight - 60, ctx.measureText(selectedWords[0]).width + 8, 30);
          ctx.fillStyle = 'white';
          ctx.fillText(selectedWords[0], 14, canvasHeight - 38);

          const rightText = selectedWords[1];
          const rightTextWidth = ctx.measureText(rightText).width;
          ctx.fillStyle = 'black';
          ctx.fillRect(canvasWidth - rightTextWidth - 18, canvasHeight - 60, rightTextWidth + 8, 30);
          ctx.fillStyle = 'white';
          ctx.fillText(rightText, canvasWidth - rightTextWidth - 14, canvasHeight - 38);
        }

        // Draw Countdown
        if (countdown !== null) {
          ctx.fillStyle = 'white';
          ctx.font = 'bold 100px Arial';
          ctx.fillText(countdown, canvasWidth / 2 - 30, canvasHeight / 2);
        }

        requestAnimationFrame(drawOnCanvas);
      }
    };
    drawOnCanvas();
  }, [selectedWords, countdown]);

  const startCountdown = () => {
    let counter = 3;
    setCountdown(counter);
    const countdownInterval = setInterval(() => {
      counter -= 1;
      setCountdown(counter);
      if (counter === 0) {
        clearInterval(countdownInterval);
        setCountdown(null);
        setState('recording');
        startRecording();
      }
    }, 1000);
  };

  const startRecording = () => {
    recordedChunks.current = [];
    recordingStartRef.current = Date.now();
    const canvasStream = canvasRef.current.captureStream(30);
    const audioTrack = videoRef.current.srcObject.getAudioTracks()[0];
    const combinedStream = new MediaStream([audioTrack, ...canvasStream.getVideoTracks()]);
    mediaRecorderRef.current = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      setState('download');
    };

    mediaRecorderRef.current.start();

    // Setup the 90-second timer
    const duration = 90 * 1000;
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed / duration) * 360;
      document.documentElement.style.setProperty('--progress', `${progress}deg`);

      if (elapsed < duration && state === 'recording') {
        requestAnimationFrame(updateProgress);
      } else {
        stopRecording();
      }
    };
    requestAnimationFrame(updateProgress);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('download');
    }
  };

  const downloadVideo = async () => {
    const completeBlob = new Blob(recordedChunks.current, { type: 'video/webm' });
    const fixedBlob = await fixWebmDuration(completeBlob, Date.now() - recordingStartRef.current);

    const url = URL.createObjectURL(fixedBlob);
    const a = document.createElement('a');
    const date = new Date();
    const filename = `${selectedWords.join('_')}_${date.toISOString().replace(/[:.]/g, '-')}.webm`;
    a.href = url;
    a.download = filename;
    a.click();

    // Clean up the URL object
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    startVideoPreview().catch(error => console.error('Error accessing video', error));
  }, [startVideoPreview]);

  return (
    <div className="app">
      <div className="video-container">
        <video ref={videoRef} className="video" muted playsInline autoPlay />
        <canvas ref={canvasRef} className="canvas" width="360" height="640" />
      </div>
      <div className="navbar-area">
        <div className={`button-area ${state}`}>
          <button onClick={handleButtonClick} className="action-button" />
        </div>
      </div>
    </div>
  );
};

export default App;
