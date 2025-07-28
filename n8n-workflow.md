### Comprehensive Implementation Guide: n8n + Gemini + Telegram Automation

This guide provides a complete blueprint for building the intelligent content automation workflow. It consolidates the high-level plan, AI prompts, Notion templates, and the detailed n8n workflow outline into a single, step-by-step guide.

---

### **Part 1: High-Level Workflow Architecture**

The workflow is triggered by a Telegram message and uses an `IF` node to branch the logic based on the message type (text vs. multimedia).

*   **Text Path:** `Telegram Trigger` -> `IF (False)` -> `Web Search` -> `Gemini (Enrich)` -> `Notion (Store)` -> `Google Sheets (Index)` -> `Telegram (Confirm)`
*   **Multimedia Path:** `Telegram Trigger` -> `IF (True)` -> `Gemini (Analyze)` -> `Web Search` -> `Google Drive (Store)` -> `Gemini (Summarize)` -> `Notion (Store)` -> `Google Sheets (Index)` -> `Telegram (Confirm)`

---

### **Part 2: Gemini System Prompts**

Use the following prompts in the respective Gemini nodes within your n8n workflow.

#### **Prompt for Text Message Processing**

*   **Use Case:** In the Gemini node following the web search in the "Text" branch.
*   **System Prompt:**
    > You are an AI assistant specializing in content synthesis and structuring. Your task is to process an original text message and enriched web search results to generate a concise, well-structured document. The output must be a single JSON object with two keys: `title` (a short, descriptive title, max 7 words) and `content` (the full, synthesized summary formatted in Markdown).
*   **Input Expression Example:**
    ```json
    {
      "original_message": "{{$json.body.message.text}}",
      "web_search_results": "{{$node['Web Search'].json.results}}"
    }
    ```

#### **Prompt for Multimedia Message Processing**

*   **Use Case:** In the second Gemini node in the "Multimedia" branch (for summarization).
*   **System Prompt:**
    > You are an AI assistant designed to analyze and summarize multimedia content. Your role is to interpret an analysis of a file and related web search results to produce a comprehensive summary. The output must be a single JSON object with two keys: `title` (a concise title, max 7 words) and `summary` (the full summary formatted in Markdown).
*   **Input Expression Example:**
    ```json
    {
      "file_content_analysis": "{{$node['Gemini (Analysis)'].json.output}}",
      "web_search_results": "{{$node['Web Search'].json.results}}"
    }
    ```

---

### **Part 3: Notion Document Templates**

Configure your Notion "Create Page" nodes to match these templates.

#### **Template 1: Text Message Output**

*   **Page Title:** `{{$node['Gemini'].json.title}}`
*   **Page Body:**
    *   `{{$node['Gemini'].json.content}}`
    *   --- (Divider) ---
    *   ### Metadata
    *   **Original Query:** `{{$json.body.message.text}}`
    *   **Processing Date:** `{{$now}}`
    *   **Index:** `[Link to Google Sheet Row]`

#### **Template 2: Multimedia Message Output**

*   **Page Title:** `{{$node['Gemini (Summarization)'].json.title}}`
*   **Page Body:**
    *   ### Key Information
    *   **Link to Original File:** `{{$node['Google Drive'].json.webViewLink}}`
    *   `{{$node['Gemini (Summarization)'].json.summary}}`
    *   --- (Divider) ---
    *   ### Metadata
    *   **Original File Name:** `{{$json.body.message.document.file_name || 'image.jpg'}}`
    *   **Processing Date:** `{{$now}}`
    *   **Index:** `[Link to Google Sheet Row]`

---

### **Part 4: Step-by-Step n8n Workflow Outline**

Build your workflow by adding and configuring the following nodes in sequence.

1.  **Telegram Trigger**: Authenticate and set to trigger on `message` updates.
2.  **IF Node**: Condition: `{{$json.body.message.photo}}` - `Is Not Empty`. (Add `OR` conditions for other file types like `document`).
3.  **Web Search**: Query: `{{$json.body.message.text}}`
4.  **Gemini Node**: Use the "Text Message Processing" prompt.
5.  **Notion Node**: Use the "Text Message Output" template.
6.  **Google Sheets Node**: Append `Timestamp`, `Type` ("Text"), `Content`, and `Notion Link`.
7.  **Telegram Node**: Send confirmation: `✅ Text archived: {{$node["Notion"].json.url}}` to chat ID `{{$json.body.message.chat.id}}`.
8.  **Gemini Node (Analysis)**: Model `gemini-pro-vision`. Prompt: "Describe this file." Pass the binary file data.
9.  **Web Search**: Query: `{{$node['Gemini (Analysis)'].json.output}}`
10. **Google Drive Node**: Upload the binary file data.
11. **Gemini Node (Summarization)**: Use the "Multimedia Message Processing" prompt.
12. **Notion Node**: Use the "Multimedia Message Output" template.
13. **Google Sheets Node**: Append `Timestamp`, `Type` ("Multimedia"), `Title`, `Notion Link`, and `File Link`.
14. **Telegram Node**: Send confirmation: `✅ File archived! Summary: {{$node["Notion"].json.url}} | File: {{$node["Google Drive"].json.webViewLink}}` to chat ID `{{$json.body.message.chat.id}}`.

This comprehensive guide provides all the necessary components to successfully build your advanced automation workflow.

---

### **Part 5: Complete n8n Workflow JSON Configuration**

Below is the complete JSON configuration for the workflow. You can import this directly into n8n. **Important:** You must replace all placeholder values (e.g., `YOUR_TELEGRAM_BOT_TOKEN`, `YOUR_NOTION_DATABASE_ID`, `YOUR_GOOGLE_SHEET_ID`) with your actual credentials and resource IDs.

```json
{
  "name": "Telegram Gemini Automation",
  "nodes": [
    {
      "parameters": {
        "updates": [
          "message"
        ],
        "botToken": "8488236618:AAHQDOQv5f0ewUPg8FcafSQABvlI_x-2OJs"
      },
      "id": "telegram-trigger",
      "name": "Telegram Trigger",
      "type": "n8n-nodes-base.telegramTrigger",
      "typeVersion": 1.1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.body.message.photo}}",
              "operation": "isEmpty"
            },
            {
              "value1": "={{$json.body.message.document}}",
              "operation": "isEmpty"
            }
          ]
        },
        "combineOperation": "any"
      },
      "id": "if-text-or-multimedia",
      "name": "IF Text or Multimedia",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [450, 300]
    },
    {
      "parameters": {
        "query": "={{$json.body.message.text}}"
      },
      "id": "web-search-text",
      "name": "Web Search (Text)",
      "type": "@n8n/n8n-nodes-langchain.toolSerpApi",
      "typeVersion": 1,
      "position": [650, 150],
      "credentials": {
        "serpApi": {
          "id": "YOUR_SERPAPI_CREDENTIAL_ID",
          "name": "SerpApi account"
        }
      }
    },
    {
      "parameters": {
        "model": "gemini-1.5-pro",
        "options": {},
        "promptType": "define",
        "text": "=You are an AI assistant specializing in content synthesis and structuring. Your task is to process an original text message and enriched web search results to generate a concise, well-structured document. The output must be a single JSON object with two keys: `title` (a short, descriptive title, max 7 words) and `content` (the full, synthesized summary formatted in Markdown).",
        "jsonInput": "={\n  \"original_message\": \"{{$json.body.message.text}}\",\n  \"web_search_results\": \"{{$node['Web Search (Text)'].json.results}}\"\n}"
      },
      "id": "gemini-enrich-text",
      "name": "Gemini (Enrich Text)",
      "type": "@n8n/n8n-nodes-langchain.googleGemini",
      "typeVersion": 1.1,
      "position": [850, 150],
      "credentials": {
        "googlePalmApi": {
          "id": "YOUR_GOOGLE_PALM_API_CREDENTIAL_ID",
          "name": "Google Palm API"
        }
      }
    },
    {
      "parameters": {
        "resource": "page",
        "operation": "create",
        "databaseId": "YOUR_NOTION_DATABASE_ID",
        "title": "={{$node['Gemini (Enrich Text)'].json.title}}",
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "Content",
              "text": "={{$node['Gemini (Enrich Text)'].json.content}}\n\n---\n\n### Metadata\n**Original Query:** {{$json.body.message.text}}\n**Processing Date:** {{$now}}"
            }
          ]
        }
      },
      "id": "notion-store-text",
      "name": "Notion (Store Text)",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2,
      "position": [1050, 150],
      "credentials": {
        "notionApi": {
          "id": "YOUR_NOTION_API_CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "operation": "append",
        "sheetId": "YOUR_GOOGLE_SHEET_ID",
        "range": "A:E",
        "options": {},
        "dataMapping": [
          {
            "column": "Timestamp",
            "value": "={{$now}}"
          },
          {
            "column": "Type",
            "value": "Text"
          },
          {
            "column": "Title",
            "value": "={{$node['Gemini (Enrich Text)'].json.title}}"
          },
          {
            "column": "Content",
            "value": "={{$node['Gemini (Enrich Text)'].json.content}}"
          },
          {
            "column": "Notion Link",
            "value": "={{$node['Notion (Store Text)'].json.url}}"
          }
        ]
      },
      "id": "google-sheets-index-text",
      "name": "Google Sheets (Index Text)",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [1250, 150],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "YOUR_GOOGLE_SHEETS_CREDENTIAL_ID",
          "name": "Google Sheets OAuth2 API"
        }
      }
    },
    {
      "parameters": {
        "chatId": "={{$json.body.message.chat.id}}",
        "text": "✅ Text archived: {{$node['Notion (Store Text)'].json.url}}"
      },
      "id": "telegram-confirm-text",
      "name": "Telegram (Confirm Text)",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.1,
      "position": [1450, 150],
      "credentials": {
        "telegramApi": {
          "id": "YOUR_TELEGRAM_BOT_CREDENTIAL_ID",
          "name": "Telegram API"
        }
      }
    },
    {
      "parameters": {
        "model": "gemini-1.5-flash",
        "options": {},
        "promptType": "define",
        "text": "=Describe this file in detail. Focus on its content, type, and any key information that can be extracted.",
        "binaryData": true
      },
      "id": "gemini-analyze-multimedia",
      "name": "Gemini (Analyze Multimedia)",
      "type": "@n8n/n8n-nodes-langchain.googleGemini",
      "typeVersion": 1.1,
      "position": [650, 450],
      "credentials": {
        "googlePalmApi": {
          "id": "YOUR_GOOGLE_PALM_API_CREDENTIAL_ID",
          "name": "Google Palm API"
        }
      }
    },
    {
      "parameters": {
        "query": "={{$node['Gemini (Analyze Multimedia)'].json.output}}"
      },
      "id": "web-search-multimedia",
      "name": "Web Search (Multimedia)",
      "type": "@n8n/n8n-nodes-langchain.toolSerpApi",
      "typeVersion": 1,
      "position": [850, 450],
      "credentials": {
        "serpApi": {
          "id": "YOUR_SERPAPI_CREDENTIAL_ID",
          "name": "SerpApi account"
        }
      }
    },
    {
      "parameters": {
        "operation": "upload",
        "fileId": "={{$json.body.message.document?.file_id || $json.body.message.photo?.slice(-1)[0]?.file_id}}",
        "parentId": "YOUR_GOOGLE_DRIVE_FOLDER_ID",
        "options": {}
      },
      "id": "google-drive-store-multimedia",
      "name": "Google Drive (Store Multimedia)",
      "type": "n8n-nodes-base.googleDrive",
      "typeVersion": 2,
      "position": [1050, 450],
      "credentials": {
        "googleDriveOAuth2Api": {
          "id": "YOUR_GOOGLE_DRIVE_CREDENTIAL_ID",
          "name": "Google Drive OAuth2 API"
        }
      }
    },
    {
      "parameters": {
        "model": "gemini-1.5-pro",
        "options": {},
        "promptType": "define",
        "text": "=You are an AI assistant designed to analyze and summarize multimedia content. Your role is to interpret an analysis of a file and related web search results to produce a comprehensive summary. The output must be a single JSON object with two keys: `title` (a concise title, max 7 words) and `summary` (the full summary formatted in Markdown).",
        "jsonInput": "={\n  \"file_content_analysis\": \"{{$node['Gemini (Analyze Multimedia)'].json.output}}\",\n  \"web_search_results\": \"{{$node['Web Search (Multimedia)'].json.results}}\"\n}"
      },
      "id": "gemini-summarize-multimedia",
      "name": "Gemini (Summarize Multimedia)",
      "type": "@n8n/n8n-nodes-langchain.googleGemini",
      "typeVersion": 1.1,
      "position": [1250, 450],
      "credentials": {
        "googlePalmApi": {
          "id": "YOUR_GOOGLE_PALM_API_CREDENTIAL_ID",
          "name": "Google Palm API"
        }
      }
    },
    {
      "parameters": {
        "resource": "page",
        "operation": "create",
        "databaseId": "YOUR_NOTION_DATABASE_ID",
        "title": "={{$node['Gemini (Summarize Multimedia)'].json.title}}",
        "propertiesUi": {
          "propertyValues": [
            {
              "key": "Content",
              "text": "### Key Information\n**Link to Original File:** {{$node['Google Drive (Store Multimedia)'].json.webViewLink}}\n\n{{$node['Gemini (Summarize Multimedia)'].json.summary}}\n\n---\n\n### Metadata\n**Original File Name:** {{$json.body.message.document?.file_name || 'image.jpg'}}\n**Processing Date:** {{$now}}"
            }
          ]
        }
      },
      "id": "notion-store-multimedia",
      "name": "Notion (Store Multimedia)",
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2,
      "position": [1450, 450],
      "credentials": {
        "notionApi": {
          "id": "YOUR_NOTION_API_CREDENTIAL_ID",
          "name": "Notion API"
        }
      }
    },
    {
      "parameters": {
        "operation": "append",
        "sheetId": "YOUR_GOOGLE_SHEET_ID",
        "range": "A:F",
        "options": {},
        "dataMapping": [
          {
            "column": "Timestamp",
            "value": "={{$now}}"
          },
          {
            "column": "Type",
            "value": "Multimedia"
          },
          {
            "column": "Title",
            "value": "={{$node['Gemini (Summarize Multimedia)'].json.title}}"
          },
          {
            "column": "Summary",
            "value": "={{$node['Gemini (Summarize Multimedia)'].json.summary}}"
          },
          {
            "column": "Notion Link",
            "value": "={{$node['Notion (Store Multimedia)'].json.url}}"
          },
          {
            "column": "File Link",
            "value": "={{$node['Google Drive (Store Multimedia)'].json.webViewLink}}"
          }
        ]
      },
      "id": "google-sheets-index-multimedia",
      "name": "Google Sheets (Index Multimedia)",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [1650, 450],
      "credentials": {
        "googleSheetsOAuth2Api": {
          "id": "YOUR_GOOGLE_SHEETS_CREDENTIAL_ID",
          "name": "Google Sheets OAuth2 API"
        }
      }
    },
    {
      "parameters": {
        "chatId": "={{$json.body.message.chat.id}}",
        "text": "✅ File archived! Summary: {{$node['Notion (Store Multimedia)'].json.url}} | File: {{$node['Google Drive (Store Multimedia)'].json.webViewLink}}"
      },
      "id": "telegram-confirm-multimedia",
      "name": "Telegram (Confirm Multimedia)",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1.1,
      "position": [1850, 450],
      "credentials": {
        "telegramApi": {
          "id": "YOUR_TELEGRAM_BOT_CREDENTIAL_ID",
          "name": "Telegram API"
        }
      }
    }
  ],
  "connections": {
    "Telegram Trigger": {
      "main": [
        [
          {
            "node": "IF Text or Multimedia",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "IF Text or Multimedia": {
      "main": [
        [
          {
            "node": "Web Search (Text)",
            "type": "main",
            "index": 0
          }
        ],
        [
          {
            "node": "Gemini (Analyze Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Web Search (Text)": {
      "main": [
        [
          {
            "node": "Gemini (Enrich Text)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini (Enrich Text)": {
      "main": [
        [
          {
            "node": "Notion (Store Text)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Notion (Store Text)": {
      "main": [
        [
          {
            "node": "Google Sheets (Index Text)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Sheets (Index Text)": {
      "main": [
        [
          {
            "node": "Telegram (Confirm Text)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini (Analyze Multimedia)": {
      "main": [
        [
          {
            "node": "Web Search (Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Web Search (Multimedia)": {
      "main": [
        [
          {
            "node": "Google Drive (Store Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Drive (Store Multimedia)": {
      "main": [
        [
          {
            "node": "Gemini (Summarize Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Gemini (Summarize Multimedia)": {
      "main": [
        [
          {
            "node": "Notion (Store Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Notion (Store Multimedia)": {
      "main": [
        [
          {
            "node": "Google Sheets (Index Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Google Sheets (Index Multimedia)": {
      "main": [
        [
          {
            "node": "Telegram (Confirm Multimedia)",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1",
  "meta": {
    "templateCredsSetupCompleted": true
  }
}
```

**Instructions for Importing and Configuration:**

1.  **Copy the JSON:** Copy the entire JSON object above.
2.  **Import into n8n:** In your n8n instance, go to the Workflows page and click "Import from File" or "Import from URL". Paste the JSON.
3.  **Set Up Credentials:** For each node (Telegram, Google Gemini, SerpApi, Notion, Google Drive, Google Sheets), you must create and assign the correct credentials. The JSON uses placeholder IDs like `YOUR_TELEGRAM_BOT_CREDENTIAL_ID`. Replace these with your actual credential IDs from your n8n credentials store.
4.  **Configure Parameters:** Update all placeholder values (e.g., `YOUR_TELEGRAM_BOT_TOKEN`, `YOUR_NOTION_DATABASE_ID`, `YOUR_GOOGLE_SHEET_ID`, `YOUR_GOOGLE_DRIVE_FOLDER_ID`) with your actual resource IDs.
5.  **Test:** Start with a simple test message to ensure the workflow triggers and processes correctly.