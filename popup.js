// the popup logic

document.getElementById("autofill").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log(tab, "active tab")
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });

  chrome.tabs.sendMessage(tab.id, { action: "autofill" });
});