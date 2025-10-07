// injected into webpage
const extractJobDataFromYC = () => {
  return document.getElementsByClassName("company-details")[0]?.textContent;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.answer) {
    const textarea = document.querySelector("textarea");
    if (textarea) textarea.value = message.answer;
  } else if (message.error) {
    console.error("Error from background:", message.error);
  } else if (message.action === "autofill") {
    const textarea = document.querySelector("textarea");
    textarea.value = "Generating response...";
    const jobData = extractJobDataFromYC();
    chrome.runtime.sendMessage({ action: "generateAnswer", jobData: jobData, source: "yc" });
  }  else if (message.action === "general") {
    const textarea = document.querySelector("textarea");
    textarea.value = "Generating response...";
    chrome.runtime.sendMessage({ action: "generateAnswer", jobData: jobData, source: "yc" });
}
});