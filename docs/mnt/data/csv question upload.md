
# 📘 NexPrepAI CSV Question Upload – Complete Guide

This comprehensive guide explains the format, validation, and process for uploading questions to NexPrepAI using CSV files or direct API calls.

---

## 🚀 Quick Start

1. **Prepare CSV File**: Format your questions using the field specifications below
2. **Admin Login**: Obtain JWT token via `/api/auth/login`
3. **Upload**: Use admin panel CSV import or direct API call to `/api/questions/import-csv`
4. **Validate**: Check response for any validation errors or warnings

---

## ✅ Required & Optional Fields

| Field          | Type       | Required | Default | Description                                                                 |
|----------------|------------|----------|---------|-----------------------------------------------------------------------------|
| **questionText** | `string`   | ✅ Yes    | -       | The main question content                                                   |
| **options**      | `string`   | ✅ Yes    | -       | Pipe-separated (`\|`) answer choices. Example: `"Option1\|Option2\|Option3"` |
| **correctOptions** | `string` | ✅ Yes    | -       | Pipe-separated correct answer(s). Must match exactly with option text     |
| **difficulty**   | `enum`     | ✅ Yes    | `Medium`| One of: `"Easy"`, `"Medium"`, `"Hard"`                                     |
| **marks**        | `number`   | ✅ Yes    | `4`     | Points awarded for correct answer (positive integer)                       |
| **branch**       | `string`   | ✅ Yes    | -       | Branch name (e.g., `"Medical"`, `"Engineering"`) - auto-created if needed  |
| **subject**      | `string`   | ✅ Yes    | -       | Subject under the branch - auto-created if needed                          |
| **topic**        | `string`   | ✅ Yes    | -       | Topic under the subject - auto-created if needed                           |
| **subtopic**     | `string`   | ✅ Yes    | -       | Subtopic under the topic - auto-created if needed                          |
| **examType**     | `string`   | ✅ Yes    | -       | Exam type code (e.g., `"NEET"`, `"JEE"`, `"AIIMS"`) - auto-created if needed |
| **explanation**  | `string`   | Optional | `""`    | Short explanation text (max 500 characters)                               |
| **explanations** | `json`     | Optional | `[]`    | Array of detailed explanation objects with `type`, `label`, `content`      |
| **askedIn**      | `json`     | Optional | `[]`    | Array of exam history objects like `[{ "examName": "NEET", "year": 2023 }]` |
| **status**       | `enum`     | Optional | `active`| Question status: `"active"` or `"inactive"`                                |
| **version**      | `number`   | Optional | `1`     | Version number of the question (positive integer)                          |

---

## 📝 CSV Format Examples

### **Basic Question Example**
```csv
questionText,options,correctOptions,explanation,difficulty,marks,branch,subject,topic,subtopic,examType,explanations,askedIn,status,version
"What is the acceleration due to gravity on Earth?","9.8 m/s²|10 m/s²|9.2 m/s²|8.9 m/s²","9.8 m/s²","Standard gravitational acceleration","Easy",4,"Medical","Physics","Mechanics","Gravitation","NEET","[]","[]","active",1
```

### **Advanced Question with Detailed Explanations**
```csv
questionText,options,correctOptions,explanation,difficulty,marks,branch,subject,topic,subtopic,examType,explanations,askedIn,status,version
"Which process is responsible for ATP synthesis in mitochondria?","Glycolysis|Citric acid cycle|Electron transport chain|Fermentation","Electron transport chain","ATP synthesis occurs via chemiosmosis","Medium",4,"Medical","Biology","Cell Biology","Respiration","NEET","[{\"type\":\"text\",\"label\":\"Concept\",\"content\":\"The electron transport chain creates a proton gradient used for ATP synthesis\"},{\"type\":\"video\",\"label\":\"Animation\",\"content\":\"https://youtube.com/watch?v=mitochondria-atp\"}]","[{\"examName\":\"NEET\",\"year\":2023},{\"examName\":\"AIIMS\",\"year\":2022}]","active",1
```

### **Multiple Correct Answers Example**
```csv
questionText,options,correctOptions,explanation,difficulty,marks,branch,subject,topic,subtopic,examType,explanations,askedIn,status,version
"Which of the following are greenhouse gases?","CO₂|N₂|CH₄|O₂|H₂O","CO₂|CH₄|H₂O","Multiple greenhouse gases contribute to global warming","Hard",4,"Medical","Chemistry","Environmental Chemistry","Atmosphere","NEET","[{\"type\":\"text\",\"label\":\"Note\",\"content\":\"CO₂, CH₄, and H₂O are major greenhouse gases\"}]","[{\"examName\":\"NEET\",\"year\":2024}]","active",1
```

---

## 📤 API Integration

### **Direct CSV Import Endpoint**
```http
POST /api/questions/import-csv
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

[
  {
    "questionText": "Sample question?",
    "options": "Option1|Option2|Option3|Option4",
    "correctOptions": "Option1",
    "explanation": "Brief explanation",
    "difficulty": "Easy",
    "marks": 4,
    "branch": "Medical",
    "subject": "Physics",
    "topic": "Mechanics",
    "subtopic": "Motion",
    "examType": "NEET",
    "status": "active",
    "version": 1
  }
]
```

### **Response Format**
```json
{
  "message": "Import successful",
  "inserted": 1,
  "errors": []
}
```

### **Partial Success Response**
```json
{
  "message": "Partial import",
  "inserted": 8,
  "errors": [
    {
      "row": 3,
      "error": "Invalid difficulty level: 'VeryEasy'"
    },
    {
      "row": 7,
      "error": "correctOptions must match option text exactly"
    }
  ]
}
```

---

## 🛡️ Validation & Auto-Creation

### **Automatic Entity Resolution**
- **Hierarchical Entities**: All entities (branch, subject, topic, subtopic, examType) are automatically resolved by name or created if they don't exist
- **Case Sensitivity**: Entity names are case-insensitive for matching but preserve original case when creating
- **Relationship Validation**: Ensures proper parent-child relationships in the educational hierarchy

### **Field Validations Applied**
- **difficulty**: Must be one of `Easy`, `Medium`, or `Hard` (case-insensitive, defaults to `Medium`)
- **status**: Must be `active` or `inactive` (defaults to `active`)
- **marks**: Must be a positive number (defaults to 4)
- **options**: Must contain at least one option with valid text
- **correctOptions**: Must exactly match at least one option text (case-sensitive)
- **explanations**: Must be valid JSON array if provided
- **askedIn**: Must be valid JSON array if provided
- **version**: Must be a positive integer (defaults to 1)

### **Error Handling**
- **Row-level Errors**: Invalid rows are skipped with detailed error messages
- **Partial Success**: Successfully validates and imports valid rows even if some fail
- **Detailed Reporting**: Each error includes row number and specific validation failure

---

## 🎯 Admin Panel Integration

### **CSV Upload Component**
1. **File Selection**: Choose CSV file from local system
2. **Client Validation**: Basic format validation before upload
3. **Progress Tracking**: Real-time upload progress and status
4. **Error Display**: Detailed error messages for failed validations
5. **Success Confirmation**: Summary of successful imports

### **Upload Process**
1. **Parse CSV**: Client-side parsing using PapaParse library
2. **Format Data**: Convert CSV rows to API-compatible JSON objects
3. **Submit Request**: Send formatted data to `/api/questions/import-csv`
4. **Handle Response**: Display success/error messages to admin user

---

## 📊 Best Practices

### **CSV File Preparation**
- **UTF-8 Encoding**: Ensure proper character encoding for special symbols
- **No Empty Rows**: Remove empty rows to avoid parsing errors
- **Consistent Formatting**: Use consistent naming for entities across rows
- **JSON Escaping**: Properly escape quotes in JSON fields (explanations, askedIn)

### **Performance Optimization**
- **Batch Size**: Upload in batches of 100-500 questions for optimal performance
- **Network Considerations**: Large files may timeout; split into smaller chunks
- **Validation First**: Test with small samples before bulk uploads

### **Quality Assurance**
- **Preview Data**: Review parsed data before submission
- **Duplicate Check**: Avoid uploading duplicate questions
- **Content Review**: Ensure question quality and accuracy before upload
- **Metadata Consistency**: Use standardized entity names across uploads

---

## 🔧 Troubleshooting

### **Common Issues**

| Issue | Cause | Solution |
|-------|-------|----------|
| "correctOptions must match option text" | Case mismatch or typo | Ensure exact case-sensitive match |
| "Invalid difficulty level" | Typo in difficulty field | Use only: Easy, Medium, Hard |
| "Invalid JSON in explanations" | Malformed JSON syntax | Validate JSON format before upload |
| "Entity creation failed" | Special characters in names | Use alphanumeric names for entities |
| "Authentication failed" | Invalid or expired token | Re-login to get fresh admin token |

### **Validation Examples**

**❌ Incorrect:**
```csv
"What is 2+2?","Three|Four|Five","four","Basic math","easy",4,"Math","Arithmetic","Addition","Basic","TEST","invalid_json","[]","Active",1
```

**✅ Correct:**
```csv
"What is 2+2?","Three|Four|Five","Four","Basic math","Easy",4,"Mathematics","Arithmetic","Addition","Basic Operations","TEST","[{\"type\":\"text\",\"label\":\"Hint\",\"content\":\"Simple addition\"}]","[]","active",1
```

---

**Last Updated**: May 29, 2025  
**Version**: 2.0  
**Related Documentation**: 
- [Complete API Reference](./API_DOCUMENTATION.md)
- [Question Upload Guide](./README_QUESTION_UPLOAD.md)
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
