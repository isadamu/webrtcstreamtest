
let pc = new RTCPeerConnection({
    iceServers: [
        {
            // urls: 'stun:stun.l.google.com:19302'
            urls: 'stun:192.168.88.60:3478'
        }
    ]
});

pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);

let log = msg => {
    document.getElementById('logs').innerHTML += msg + '<br>';
};

// 调用本地摄像头
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        document.getElementById('video1').srcObject = stream;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

    }).catch(log);


// 处理远端 track
let videoElem = document.getElementById('video2');
let mediaTracks = [];    // 用于统计
pc.ontrack = ev => {
    if (ev.streams && ev.streams[0]) {
        console.log("on track" + ev.streams[0]);
        videoElem.srcObject = ev.streams[0];
        mediaTracks.push(ev.track);
    }
}

// 接收远端的offer,生成answer
window.setOffer = () => {
    let offer = document.getElementById('RemoteBase64Offer').value;
    if (offer === '') {
        return alert('Session Description must not be empty');
    }

    try {
        pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(offer))));
    } catch (e) {
        alert(e);
    }

    pc.createAnswer().then(
        answer => pc.setLocalDescription(answer)).then(
        () => document.getElementById('LocalBase64Answer').value = btoa(JSON.stringify(pc.localDescription))
    );

};


// 处理远端打开dataChannel的请求
let chann;
pc.ondatachannel = event => {

    chann = event.channel;

    console.log("New DataChannel ", chann.label, chann.id);

    chann.onopen = function() {
        console.log("DataChannel ", chann.label, chann.id, " open");
    };

    chann.onmessage = event => {
        log(`Message from DataChannel '${chann.label}' payload '${event.data}'`);
    };
}

window.sendMessage = () => {
    let message = document.getElementById('message').value;
    if (message === '') {
        return alert('Message must not be empty')
    }

    chann.send(message);
};


// 这里稍微过滤了一下,只统计输入的音视频流,并计算出实时码率(简单平滑了一下)
const statIntervalBase = 1000;
const statInterval = 1;
let lastRecvByteVideo = 0;
let lastRecvByteAudio = 0;
window.setInterval(function() {
    if (mediaTracks.length <= 0) {
        return;
    }

    mediaTracks.forEach(track => {

        pc.getStats(track).then(stats => {
            stats.forEach(report => {
                if (report.type === "inbound-rtp") {
                    let statsOutput = "";
                    statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
                        `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;

                    Object.keys(report).forEach(statName => {
                        if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
                            statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
                        }
                    });

                    let RecvByte = report.bytesReceived;

                    if (report.mediaType === "video") {
                        document.getElementById("stats-video").innerHTML = statsOutput;

                        let bitRate = ((RecvByte - lastRecvByteVideo) * 8) / (statInterval * 1000);
                        lastRecvByteVideo = RecvByte;

                        document.getElementById("remote-stat-video-show").innerHTML = "video: " + bitRate + " kbps";

                    } else if (report.mediaType === "audio") {
                        document.getElementById("stats-audio").innerHTML = statsOutput;

                        let bitRate = ((RecvByte - lastRecvByteAudio) * 8) / (statInterval * 1000);
                        lastRecvByteAudio = RecvByte;

                        document.getElementById("remote-stat-audio-show").innerHTML = "audio: " + bitRate + " kbps";
                    }
                }
            });
        });
    });

}, statIntervalBase * statInterval);