# 📦 Ans Shift - Parcel Delivery Management System (Backend API)

![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-v4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Payment_Integration-6772E5?style=for-the-badge&logo=stripe&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

The backend service for **Ans Shift**, a full-featured parcel delivery web application. This API manages user roles, parcel booking and tracking, automated/manual rider assignments, secure payment flows, and comprehensive administrative oversight.

🌐 **Live Website:** [https://ans-shift.web.app/](https://ans-shift.web.app/)  
💻 **Client Repository:** [GitHub Frontend Repo](https://lnkd.in/gQqxnKNn)  
💻 **Server Repository:** [GitHub Backend Repo](https://lnkd.in/gtvCPS4j)

---

## 🚀 Key Features & Role-Based Workflows

### 🔐 Authentication & Authorization
- **JWT (JSON Web Token):** Secure authentication and route authorization.
- **Role-Based Access Control (RBAC):** Customized access and permissions for `User` (Customer), `Rider`, and `Admin`.

### 👤 Customer Features
- **Parcel Booking:** Create parcel requests with sender, receiver, parcel details, and destination addresses.
- **Real-Time Tracking:** Track delivery stages and status updates (`Pending`, `Assigned`, `Picked Up`, `Delivered`).
- **Secure Online Payment:** Seamless checkout powered by **Stripe API**.

### 🛵 Rider Features
- **Pickup & Delivery Workflow:** View assigned parcels, manage pickups, and update delivery statuses upon successful fulfillment.
- **Delivery Management:** Instant updates to parcel status ensuring transparent tracking.

### 👑 Admin Management Dashboard
- **Rider Management:** Review rider applications, approve or reject applications, add new riders, and manage existing delivery personnel.
- **Parcel Assignment:** Assign incoming delivery requests to active delivery riders.
- **User & System Oversight:** Complete access to manage user accounts, assign roles, and control overall delivery operations.

---

## 🛠️ Tech Stack & Tools

- **Runtime Environment:** Node.js
- **Web Framework:** Express.js
- **Database:** MongoDB
- **Security & Authentication:** JSON Web Token (JWT), CORS, Dotenv
- **Payment Gateway:** Stripe
- **Process Manager:** Nodemon

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory of your project and configure the following credentials:

```env
# Database Credentials
DB_USER=your_mongodb_username
DB_PASSWORD=your_mongodb_password

# Payment Credentials
STRIPE_SECRET=your_stripe_secret_key

# Domain & Services Configuration
SITE_DOMAIN=http://localhost:5000
FB_SERVICE_KEY=your_firebase_service_key_json
