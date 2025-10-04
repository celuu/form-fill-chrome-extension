async function getResume() {
  const url = chrome.runtime.getURL("resume.txt");
  const response = await fetch(url);
  return response.text();
}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "generateAnswer") {
    console.log("im in here")
    const response = await fetch("https://api.openapi.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5o-mini",
        input:
          "You are a helpful assistant. Where you have this resume to answer the question:\nResume:\n${resume} and I need you to look up the company I give you and write at least 50 words of why I would be a great fit for the company, make it ",
      }),
    });
    const data = await response.json();
    const output = data.output?.[0]?.content?.[0]?.text || "Unknown";
    console.log(output);
    sendResponse({ answer: output });
  }
  return true;
});
