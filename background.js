

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === "generateAnswer") {
    (async () => {
      try {
        const resumeUrl = chrome.runtime.getURL("/resume.txt");
        const resumeResponse = await fetch(resumeUrl);
        const resumeText = await resumeResponse.text();
        const requestSource = request.source;
        let jobDescription = request.jobData;

        let systemMessage = "";
        let prompt = "";
        if (requestSource === "yc") {
          systemMessage = `
            You are a helpful assistant for writing YC job application responses.
            Always write in first person, at least 50 words, directly copy-pastable into a form.
            Do not add markdown, comments, or extra text.
          `;

          prompt = `
            Use the following resume and job description to generate your answer:
        
            Resume:
            ${resumeText}
        
            Job Description:
            ${jobDescription}
          `;
        } else {
          systemMessage = `
            You are a web form parser that outputs ONLY valid JSON with input IDs as keys
            and job applicant values as values. Do not include markdown or extra text.
          `;

          prompt = `
            Use the following resume and job description to generate a JSON object:
        
            Resume:
            ${resumeText}
        
            Job Description:
            ${jobDescription}
          `;
        }
        

          const requestBody = {
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: prompt },
            ],
          };

          if (request.source !== "yc") {
            requestBody.response_format = { type: "json_object" };
          }
      
          const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENAIAPIKEY}`,
              },
              body: JSON.stringify(requestBody),
            }
          );

        const data = await response.json();
        const output =
          data?.choices?.[0]?.message?.content?.trim() || "No response";
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