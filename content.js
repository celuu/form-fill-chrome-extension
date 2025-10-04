// injected into webpage

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofill") {
    const textarea = document.querySelector("textarea");
    chrome.runtime.sendMessage(
      { action: "generateAnswer" },
      (response) => {
        if (response?.answer && textarea) {
          textarea.value = response.answer;
        } else {
          console.error(response?.error || "No answer received.");
        }
      }
    );
  }
});