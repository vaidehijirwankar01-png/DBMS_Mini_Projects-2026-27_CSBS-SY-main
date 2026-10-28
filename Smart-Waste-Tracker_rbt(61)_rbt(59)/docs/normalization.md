# Database Normalization Report: Smart Waste Collection & Segregation Tracker

This document provides a formal database normalization study for the **Smart Waste Collection & Segregation Tracker** (`smart_waste_db`). It walks through the complete progression from an **Unnormalized Form (UNF)** to the **Third Normal Form (3NF)** and **Boyce-Codd Normal Form (BCNF)**, detailing functional dependencies and showing how normalization eliminates insertion, update, and deletion anomalies.

---

## 1. Introduction to Normalization

Normalization is a formal database design technique that organizes tables in a manner that minimizes redundancy and prevents modification anomalies without sacrificing information integrity. 

In municipal waste management systems, unnormalized storage leads to severe data integrity issues:
- Storing citizen contact details alongside every collection request causes massive disk bloat.
- Changing a worker's phone number requires updating hundreds of historical task rows.
- Deleting an old pickup record could inadvertently purge an entire residential area from the system.

---

## 2. Unnormalized Form (UNF)

Consider a flat spreadsheet or legacy table where municipal authorities record every pickup transaction in a single unnormalized structure:

### Unnormalized Relation: `UNF_WasteRecord`
```
UNF_WasteRecord (
    RequestID, CitizenName, CitizenEmail, CitizenPhone, CitizenAreaName, CitizenLocality, 
    PostalCode, WasteCategoryName, CategoryDescription, SegregationInstructions, ColorCode,
    EstimatedQtyKg, ActualQtyKg, PickupAddress, PreferredDate, Status, RequestCreatedAt,
    WorkerName, WorkerEmail, WorkerPhone, WorkerAvailability, AssignedDate,
    SegregatedCategories [Repeating Group: Category, Weight, IsCorrect, Status],
    RecyclingBatches [Repeating Group: Method, Destination, ProcessedDate, Weight],
    FeedbackRating, FeedbackComments
)
```

### Violations in UNF:
1. **Repeating Groups:** Multiple segregation portions and recycling records exist within a single row.
2. **Multi-Valued Attributes:** Multiple waste streams per pickup.
3. **Redundancy:** Area descriptions, worker contacts, and category instructions repeat for every single collection request.

---

## 3. First Normal Form (1NF)

### 1NF Definition:
A relation is in **First Normal Form (1NF)** if and only if all underlying attribute domains contain only **atomic (indivisible) values**, and there are no repeating groups or nested relations.

### Transformation to 1NF:
1. Eliminate repeating groups by splitting segregation audits and recycling batches into their own tuples.
2. Ensure every attribute column holds a single scalar value.
3. Identify a composite primary key for the flattened relation.

### Flattened 1NF Relation:
```
R_1NF (
    RequestID (PK),
    CitizenEmail, CitizenName, CitizenPhone,
    AreaName, Locality, PostalCode,
    CategoryName, CategoryDesc, SegInstructions, ColorCode,
    EstimatedQtyKg, ActualQtyKg, PickupAddress, PreferredDate, Status, RequestCreatedAt,
    WorkerEmail, WorkerName, WorkerPhone, WorkerAvailability,
    SegregatedCategoryName (PK), SegregatedQty, IsCorrect, SegStatus,
    FeedbackRating, FeedbackComments
)
```

### Functional Dependencies in 1NF:
- `RequestID -> CitizenEmail, CitizenName, CitizenPhone, AreaName, Locality, PostalCode, CategoryName, CategoryDesc, EstimatedQtyKg, ActualQtyKg, PickupAddress, PreferredDate, Status, WorkerEmail, WorkerName, FeedbackRating`
- `(RequestID, SegregatedCategoryName) -> SegregatedQty, IsCorrect, SegStatus`
- `CitizenEmail -> CitizenName, CitizenPhone, AreaName`
- `AreaName -> Locality, PostalCode`
- `CategoryName -> CategoryDesc, SegInstructions, ColorCode`
- `WorkerEmail -> WorkerName, WorkerPhone, WorkerAvailability`

### Why 1NF is Insufficient:
The primary key is composite: `{RequestID, SegregatedCategoryName}`. Many non-key attributes depend only on `RequestID`, violating Second Normal Form.

---

## 4. Second Normal Form (2NF)

### 2NF Definition:
A relation is in **Second Normal Form (2NF)** if and only if:
1. It is already in **1NF**.
2. **No non-prime attribute is partially dependent** on any candidate key (every non-key attribute is fully functionally dependent on the primary key).

### Identification of Partial Dependencies:
In `R_1NF`, the composite key is `{RequestID, SegregatedCategoryName}`:
- `{RequestID, SegregatedCategoryName} -> SegregatedQty` is a **Full Dependency**.
- `RequestID -> CitizenEmail, EstimatedQtyKg, PickupAddress, Status` is a **Partial Dependency** (depends only on part of the key!).

### Decomposition into 2NF:
We decompose `R_1NF` into relations where all attributes fully depend on their relation's primary key:

1. **`R_Requests`** (`RequestID` PK):
   `RequestID -> CitizenEmail, CategoryName, AreaName, EstimatedQtyKg, ActualQtyKg, PickupAddress, PreferredDate, Status, WorkerEmail, FeedbackRating, FeedbackComments`
2. **`R_Segregation`** (`RequestID, CategoryID` PK):
   `(RequestID, CategoryID) -> SegregatedQty, IsCorrect, SegStatus`

---

## 5. Third Normal Form (3NF)

### 3NF Definition:
A relation is in **Third Normal Form (3NF)** if and only if:
1. It is already in **2NF**.
2. **No non-prime attribute is transitively dependent** on any candidate key (if $X \to Y$ and $Y \to Z$, where $Y$ is not a superkey, then transitive dependency $X \to Z$ must be eliminated).

### Identification of Transitive Dependencies in 2NF Relations:
In `R_Requests`, we observe several transitive chains:
1. `RequestID -> CitizenEmail` AND `CitizenEmail -> CitizenName, CitizenPhone, AreaName`.  
   &rarr; `RequestID -> CitizenName` is a **Transitive Dependency** via `CitizenEmail`.
2. `RequestID -> AreaName` AND `AreaName -> Locality, PostalCode`.  
   &rarr; `RequestID -> PostalCode` is a **Transitive Dependency** via `AreaName`.
3. `RequestID -> CategoryName` AND `CategoryName -> CategoryDescription, SegregationInstructions, ColorCode`.  
   &rarr; `RequestID -> CategoryDescription` is a **Transitive Dependency** via `CategoryName`.
4. `RequestID -> WorkerEmail` AND `WorkerEmail -> WorkerName, WorkerPhone, Availability`.  
   &rarr; `RequestID -> WorkerPhone` is a **Transitive Dependency** via `WorkerEmail`.

### Decomposition into 3NF:
To reach 3NF, we extract each determinant that is not a superkey into its own independent relation:

1. **`areas`** (`area_id` PK):  
   `area_id -> area_name, locality, postal_code`  
   *(All attributes depend solely on `area_id`)*

2. **`waste_categories`** (`category_id` PK):  
   `category_id -> category_name, description, segregation_instructions, color_code`  
   *(All attributes depend solely on `category_id`)*

3. **`users`** (`user_id` PK):  
   `user_id -> full_name, email, password_hash, phone, role, area_id, is_active`  
   *(All attributes depend solely on `user_id`)*

4. **`workers`** (`worker_id` PK, `user_id` FK/UK):  
   `worker_id -> user_id, availability_status, joining_date, total_collections`

5. **`collection_requests`** (`request_id` PK):  
   `request_id -> citizen_id, category_id, area_id, estimated_quantity_kg, actual_quantity_kg, pickup_address, preferred_date, status, notes, created_at, completed_at`

6. **`assignments`** (`assignment_id` PK):  
   `assignment_id -> request_id, worker_id, assigned_by, assigned_at, assignment_status`

7. **`segregation_records`** (`segregation_id` PK):  
   `segregation_id -> request_id, category_id, quantity_kg, is_correctly_segregated, segregation_status, recorded_by, recorded_at, remarks`

8. **`recycling_records`** (`recycling_id` PK):  
   `recycling_id -> request_id, quantity_kg, processing_type, destination, processed_at, notes`

9. **`feedback`** (`feedback_id` PK):  
   `feedback_id -> request_id, citizen_id, rating, comments, submitted_at`

10. **`collection_status_history`** (`history_id` PK):  
    `history_id -> request_id, previous_status, new_status, changed_by, changed_at, remarks`

---

## 6. Functional Dependencies Table

| Relation | Determinant (LHS) | Dependent Attributes (RHS) | Normal Form Level |
| :--- | :--- | :--- | :--- |
| `areas` | `area_id` | `area_name, locality, postal_code, created_at` | **BCNF / 3NF** |
| `waste_categories` | `category_id` | `category_name, description, segregation_instructions, color_code` | **BCNF / 3NF** |
| `users` | `user_id` | `full_name, email, password_hash, phone, role, area_id, is_active, created_at, updated_at` | **BCNF / 3NF** |
| `users` | `email` | `user_id, full_name, password_hash, phone, role, area_id, is_active` | **Candidate Key** |
| `workers` | `worker_id` | `user_id, availability_status, joining_date, total_collections` | **BCNF / 3NF** |
| `collection_requests`| `request_id` | `citizen_id, category_id, area_id, estimated_quantity_kg, actual_quantity_kg, pickup_address, preferred_date, status, notes, created_at, updated_at, completed_at` | **BCNF / 3NF** |
| `assignments` | `assignment_id` | `request_id, worker_id, assigned_by, assigned_at, assignment_status` | **BCNF / 3NF** |
| `segregation_records`| `segregation_id` | `request_id, category_id, quantity_kg, is_correctly_segregated, segregation_status, recorded_by, recorded_at, remarks` | **BCNF / 3NF** |
| `recycling_records` | `recycling_id` | `request_id, quantity_kg, processing_type, destination, processed_at, notes` | **BCNF / 3NF** |
| `feedback` | `feedback_id` | `request_id, citizen_id, rating, comments, submitted_at` | **BCNF / 3NF** |
| `collection_status_history` | `history_id` | `request_id, previous_status, new_status, changed_by, changed_at, remarks` | **BCNF / 3NF** |

---

## 7. Prevention of Database Anomalies

The 3NF decomposition directly prevents the three classic database modification anomalies:

### A. Insertion Anomaly
* **Unnormalized Problem:** In `UNF_WasteRecord`, a municipality cannot register a newly added geographic service area (e.g. 'North Tech Zone', PIN `560064`) unless a citizen in that zone immediately schedules a waste pickup request.
* **3NF Solution:** `areas` exists independently. A new area is inserted into `areas` without requiring any associated collection requests or users (`INSERT INTO areas ...`).

### B. Update Anomaly
* **Unnormalized Problem:** If sanitation worker *Suresh Kumar* changes his mobile phone number, an unnormalized system must update dozens or hundreds of collection rows. If one row is missed, data becomes inconsistent.
* **3NF Solution:** Worker phone number is stored in exactly **one tuple** in the `users` table. A single `UPDATE users SET phone = ... WHERE user_id = ...` instantly reflects across all past, present, and future assignment queries.

### C. Deletion Anomaly
* **Unnormalized Problem:** If a citizen cancels their only collection request in an unnormalized system, deleting the row inadvertently purges the citizen's user record and the waste category definition from the entire database.
* **3NF Solution:** Deleting or cancelling a row in `collection_requests` leaves the citizen in `users`, the area in `areas`, and the waste classification in `waste_categories` untouched.

---

## 8. Conclusion

Every table in `smart_waste_db` has atomic attributes (1NF), contains no partial functional dependencies (2NF), and contains no transitive functional dependencies (3NF). Furthermore, because every determinant is a superkey, the schema satisfies **Boyce-Codd Normal Form (BCNF)**, guaranteeing minimal disk redundancy and maximum data consistency.

