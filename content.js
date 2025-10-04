// injected into webpage

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "autofill") {
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.value = "Generated answer using my resume!";
    }
  }
});