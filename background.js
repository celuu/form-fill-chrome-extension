
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "generateAnswer") {
    (async () => {
      try {
        const resumeUrl = chrome.runtime.getURL("/resume.txt");
        const resumeResponse = await fetch(resumeUrl);
        const resumeText = await resumeResponse.text();

      
        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAIAPIKEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            input: `You are a helpful assistant. Where you have this resume to answer the question:\nResume:\n${resumeText} and I need you to look up the company Flock Safetly and write at least 50 words of why I would be a great fit for the company, return this response.`,
          }),
        });
        const data = await response.json();
        const output = data.output?.[0]?.content?.[0]?.text || "No response";
        if (sender?.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, { answer: output });
        }
      } catch (err) {
        console.error("Error:", err);
        if (sender?.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, { error: err.message });
        }
      }
    })();

    return true;
  }
});