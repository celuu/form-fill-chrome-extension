// the popup logic
document.getElementById("save").addEventListener("click", () => {
  const resume = document.getElementById("resume").value;
  chrome.storage.local.set({ resume }, () => {
    alert("Resume saved!");
  });
});