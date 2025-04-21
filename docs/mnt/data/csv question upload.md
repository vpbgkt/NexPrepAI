
# 📘 NexPrep CSV Question Upload – Documentation

This guide explains the format and process for uploading questions to NexPrep using CSV or API.

---

## ✅ Supported Fields

| Field          | Type       | Description                                                                 |
|----------------|------------|-----------------------------------------------------------------------------|
| questionText   | `string`   | The text of the question                                                   |
| options        | `string`   | Pipe-separated (`|`) answer choices. Example: `"Option1|Option2|Option3"` |
| correctOptions | `string`   | Pipe-separated correct answer(s). Must match exactly with an option text   |
| explanation    | `string`   | Short explanation string                                                   |
| difficulty     | `enum`     | One of: `"Easy"`, `"Medium"`, `"Hard"`                                     |
| marks          | `number`   | Marks awarded for correct answer                                           |
| branch         | `string`   | Branch name (e.g., `"Medical"`, `"Engineering"`)                           |
| subject        | `string`   | Subject under the branch                                                   |
| topic          | `string`   | Topic under the subject                                                    |
| subtopic       | `string`   | Subtopic under the topic                                                   |
| examType       | `string`   | Exam type (e.g., `"NEET"`, `"AIIMS"`, `"JEE"`)                             |
| explanations   | `json`     | Array of explanation objects with `type`, `label`, `content`              |
| askedIn        | `json`     | Array of objects like `[{ "examName": "NEET", "year": 2023 }]`           |
| status         | `enum`     | `"active"` or `"inactive"`                                                 |
| version        | `number`   | Version number of the question                                             |

---

## 📝 Example CSV Row

```
questionText,options,correctOptions,explanation,difficulty,marks,branch,subject,topic,subtopic,examType,explanations,askedIn,status,version
"What is g?","9.8 m/s²|10 m/s²|9.2 m/s²|8.9 m/s²","9.8 m/s²","Gravity is 9.8 m/s².","Easy",4,"Medical","Physics","Mechanics","Gravitation","NEET","[{\"type\":\"text\",\"label\":\"Concept\",\"content\":\"g is acceleration.\"}]","[{\"examName\":\"NEET\",\"year\":2022}]","active",1
```

---

## 📤 API Endpoint (Swagger)

**POST** `/api/questions/import-csv`  
**Auth Required:** ✅ Bearer Token  
**Body:** `Array<Question>` (parsed from CSV)

---

## 🛡️ Auto Validation & Creation

- All hierarchical values (branch, subject, topic, subtopic, examType) are auto-resolved or created.
- Validations applied:
  - `difficulty` → one of `Easy | Medium | Hard`
  - `status` → one of `active | inactive`
  - `options[]` must include `text`
  - `correctOptions[]` must match at least one `options.text`

---

_Last updated: 2025-04-21 07:26:15_
