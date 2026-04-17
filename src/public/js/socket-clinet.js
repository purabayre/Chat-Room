const socket = io();

const roomId = document.getElementById("roomId").value;
socket.emit("join-room", roomId);

document.getElementById("msgInput").addEventListener("input", () => {
  socket.emit("typing", roomId);
});

document.getElementById("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const text = msgInput.value;
  const userId = document.getElementById("userId").value;

  socket.emit("send-message", { roomId, text, userId });

  msgInput.value = "";
});

socket.on("new-message", (data) => {
  const div = document.createElement("div");
  div.innerText = data.text;
  document.getElementById("messages").appendChild(div);
});

socket.on("user-typing", () => {
  document.getElementById("typing").innerText = "Someone is typing...";
  setTimeout(() => {
    document.getElementById("typing").innerText = "";
  }, 1000);
});
