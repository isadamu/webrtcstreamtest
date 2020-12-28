/* eslint-env browser */

let pc = new RTCPeerConnection({
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
            // urls: 'stun:192.168.88.60:3478'
        }
    ]
});

let log = msg => {
    document.getElementById('logs').innerHTML += msg + '<br>';
};

pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);

// 如果有新的候选出现，那么就将SDP （offer）填入 LocalBase64Offer 这个文本框中。
// 注意，event.candidate 为空时，代表完成所有候选搜索，这个搜索过程会持续很长时间。
// 由于这里是本地连接，所以不需要等到所有候选搜索完毕，只需要一个本地host候选就够了（这个候选webrtc可以马上找到）。
pc.onicecandidate = event => {
    if (event.candidate) {
        document.getElementById('LocalBase64Offer').value = btoa(JSON.stringify(pc.localDescription));
    }
};


// 调用摄像头，通过 addTrack 将音视频加入pc
// 修改编码顺序
// 调用createOffer触发候选搜索(也就是onicecandidate)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
        document.getElementById('video1').srcObject = stream;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 更改音视频编码顺序
        changeVideoCodec("video/H264");

        pc.createOffer().then(d => {
            // 这里可以打印以下offer看看内容
            console.log("############################################");
            console.log(d);
            console.log("############################################");
            pc.setLocalDescription(d).catch(log);
        });
    }).catch(log);



// 设置远端的Answer 建立连接
window.startSession = () => {
    let sd = document.getElementById('RemoteBase64Answer').value;
    if (sd === '') {
        return alert('Session Description must not be empty');
    }

    try {
        pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(sd))));
    } catch (e) {
        alert(e);
    }
};



// 在此pc中建立dataChannel
let sendChannel = pc.createDataChannel('foo');
sendChannel.onclose = () => console.log('sendChannel has closed');
sendChannel.onopen = () => console.log('sendChannel has opened');
sendChannel.onmessage = e => log(`Message from DataChannel '${sendChannel.label}' payload '${e.data}'`);

window.sendMessage = () => {
    let message = document.getElementById('message').value;
    if (message === '') {
        return alert('Message must not be empty');
    }

    sendChannel.send(message);
};


// 处理远端视频
let videoElem = document.getElementById('video2');
pc.ontrack = ev => {
    if (ev.streams && ev.streams[0]) {
        videoElem.srcObject = ev.streams[0];
        console.log(ev.streams[0]);
    }
}


// 每秒钟打印 stats 信息
window.setInterval(function() {
    pc.getStats(null).then(stats => {
        let statsOutput = "";

        stats.forEach(report => {
            statsOutput += `<h2>Report: ${report.type}</h3>\n<strong>ID:</strong> ${report.id}<br>\n` +
                `<strong>Timestamp:</strong> ${report.timestamp}<br>\n`;

            // Now the statistics for this report; we intentially drop the ones we
            // sorted to the top above

            Object.keys(report).forEach(statName => {
                if (statName !== "id" && statName !== "timestamp" && statName !== "type") {
                    statsOutput += `<strong>${statName}:</strong> ${report[statName]}<br>\n`;
                }
            });
        });

        document.getElementById("stats-box").innerHTML = statsOutput;
    });
}, 1000);


// 用于修改视频的编码优先顺序
function changeVideoCodec(mimeType) {
    const transceivers = pc.getTransceivers();

    transceivers.forEach(transceiver => {
        const kind = transceiver.sender.track.kind;
        let sendCodecs = RTCRtpSender.getCapabilities(kind).codecs;
        let recvCodecs = RTCRtpReceiver.getCapabilities(kind).codecs;

        if (kind === "video") {
            sendCodecs = preferCodec(sendCodecs, mimeType);
            recvCodecs = preferCodec(recvCodecs, mimeType);
            transceiver.setCodecPreferences([...sendCodecs, ...recvCodecs]);
        }
    });

}

// 将偏好的编码格式放到数组前，其它编码格式放到数组后
function preferCodec(codecs, mimeType) {
    let otherCodecs = [];
    let sortedCodecs = [];

    codecs.forEach(codec => {
        if (codec.mimeType === mimeType) {
            sortedCodecs.push(codec);
        } else {
            otherCodecs.push(codec);
        }
    });

    sortedCodecs = sortedCodecs.concat(otherCodecs)

    console.log(sortedCodecs);

    return sortedCodecs;
}


// 可以用来查询音视频有哪些编码
let codecList = RTCRtpSender.getCapabilities("video").codecs;

console.log(codecList);


codecList = RTCRtpSender.getCapabilities("audio").codecs;

console.log(codecList);