// Initial seed matching spec section 5 & 8

let mockComplaints = [
  {
    id: 101,
    customer_name: "Ayesha Khan",
    customer_contact: "ayesha.khan@example.com",
    text: "Payment deducted from my credit card but the order still shows pending and no confirmation was sent.",
    category: "payment",
    sentiment: "frustrated",
    urgency: "high",
    analysis_source: "ai",
    status: "linked",
    incident_id: 1,
    created_at: "2026-11-10T06:42:10Z"
  },
  {
    id: 102,
    customer_name: "Bilal Ahmed",
    customer_contact: "bilal.a@example.com",
    text: "Charged twice for order #99281, bank notified debit but website threw a 504 Gateway error.",
    category: "payment",
    sentiment: "frustrated",
    urgency: "high",
    analysis_source: "ai",
    status: "linked",
    incident_id: 1,
    created_at: "2026-11-10T06:45:22Z"
  },
  {
    id: 103,
    customer_name: "Fatima Noor",
    customer_contact: "fatima.noor@example.com",
    text: "Money was debited from my account at checkout, but cart didn't empty and order wasn't created.",
    category: "payment",
    sentiment: "negative",
    urgency: "high",
    analysis_source: "ai",
    status: "linked",
    incident_id: 1,
    created_at: "2026-11-10T07:10:04Z"
  },
  {
    id: 104,
    customer_name: "Zainab Tariq",
    customer_contact: "zainab.t@example.com",
    text: "Checkout button spun forever, got SMS from bank that payment went through, no order summary.",
    category: "payment",
    sentiment: "frustrated",
    urgency: "high",
    analysis_source: "ai",
    status: "linked",
    incident_id: 1,
    created_at: "2026-11-10T07:22:15Z"
  },
  {
    id: 105,
    customer_name: "Hamza Malik",
    customer_contact: "hamza@example.com",
    text: "Payment gateway timed out during OTP verification, card charged anyway without receipt.",
    category: "payment",
    sentiment: "negative",
    urgency: "medium",
    analysis_source: "ai",
    status: "linked",
    incident_id: 1,
    created_at: "2026-11-10T07:35:40Z"
  },
  {
    id: 106,
    customer_name: "Usman Raza",
    customer_contact: "usman.r@example.com",
    text: "App constantly logs me out every 30 seconds when browsing products. Cannot keep session alive.",
    category: "login",
    sentiment: "frustrated",
    urgency: "critical",
    analysis_source: "ai",
    status: "linked",
    incident_id: 2,
    created_at: "2026-11-10T08:01:11Z"
  },
  {
    id: 107,
    customer_name: "Mariam Siddiqui",
    customer_contact: "mariam.s@example.com",
    text: "Session expired error appears immediately after entering 2FA code. Can't access my account.",
    category: "login",
    sentiment: "negative",
    urgency: "critical",
    analysis_source: "ai",
    status: "linked",
    incident_id: 2,
    created_at: "2026-11-10T08:12:30Z"
  },
  {
    id: 108,
    customer_name: "Omer Farooq",
    customer_contact: "omer.f@example.com",
    text: "Invalid token error loop on iOS app version 4.2. Keeps bouncing back to login screen.",
    category: "login",
    sentiment: "frustrated",
    urgency: "high",
    analysis_source: "ai",
    status: "linked",
    incident_id: 2,
    created_at: "2026-11-10T08:24:50Z"
  },
  {
    id: 109,
    customer_name: "Hassan Ali",
    customer_contact: "hassan.ali@example.com",
    text: "Placed an order 2 hours ago. Money deducted but haven't received confirmation email or tracking link.",
    category: "delivery",
    sentiment: "neutral",
    urgency: "medium",
    analysis_source: "ai",
    status: "linked",
    incident_id: 3,
    created_at: "2026-11-10T08:40:19Z"
  },
  {
    id: 110,
    customer_name: "Sara Qureshi",
    customer_contact: "sara.q@example.com",
    text: "Where is my order confirmation email? Order #98124 shows completed in dashboard but inbox empty.",
    category: "delivery",
    sentiment: "neutral",
    urgency: "low",
    analysis_source: "ai",
    status: "linked",
    incident_id: 3,
    created_at: "2026-11-10T08:52:00Z"
  },
  {
    id: 111,
    customer_name: "Danish Iqbal",
    customer_contact: "danish.i@example.com",
    text: "Discount voucher 'SAVE20' took off only $3.99 on a $50 cart instead of 20%.",
    category: "billing",
    sentiment: "negative",
    urgency: "low",
    analysis_source: "ai",
    status: "linked",
    incident_id: 4,
    created_at: "2026-11-10T05:15:00Z"
  },
  {
    id: 112,
    customer_name: "Rabia Basri",
    customer_contact: "rabia@example.com",
    text: "Coupon discount rounding truncated the price inappropriately on checkout summary.",
    category: "billing",
    sentiment: "neutral",
    urgency: "low",
    analysis_source: "ai",
    status: "linked",
    incident_id: 4,
    created_at: "2026-11-10T05:30:10Z"
  },
  {
    id: 113,
    customer_name: "Tariq Mehmood",
    customer_contact: "tariq.m@example.com",
    text: "Promotional discount not calculating correctly for bundled electronics items.",
    category: "billing",
    sentiment: "negative",
    urgency: "low",
    analysis_source: "ai",
    status: "possible_recurrence",
    incident_id: 4,
    created_at: "2026-11-10T09:45:00Z"
  },
  {
    id: 114,
    customer_name: "Nida Aslam",
    customer_contact: "nida@example.com",
    text: "Coupon code calculations still seem off after the supposed fix this morning.",
    category: "billing",
    sentiment: "frustrated",
    urgency: "medium",
    analysis_source: "ai",
    status: "possible_recurrence",
    incident_id: 4,
    created_at: "2026-11-10T09:52:14Z"
  },
  {
    id: 115,
    customer_name: "Khurram Shahzad",
    customer_contact: "khurram@example.com",
    text: "Search bar autocomplete is very slow today, takes 4 seconds to show matching products.",
    category: "performance",
    sentiment: "neutral",
    urgency: "low",
    analysis_source: "ai",
    status: "new",
    incident_id: null,
    created_at: "2026-11-10T09:10:00Z"
  },
  {
    id: 116,
    customer_name: "Sana Javed",
    customer_contact: "sana.j@example.com",
    text: "Can I update my registered shipping address before dispatch? Can't find the edit button.",
    category: "account",
    sentiment: "neutral",
    urgency: "low",
    analysis_source: "fallback",
    status: "new",
    incident_id: null,
    created_at: "2026-11-10T09:18:22Z"
  },
  {
    id: 117,
    customer_name: "Kamran Akmal",
    customer_contact: "kamran@example.com",
    text: "Delivery rider arrived without prior call, package was left with neighbor without notice.",
    category: "delivery",
    sentiment: "negative",
    urgency: "medium",
    analysis_source: "ai",
    status: "new",
    incident_id: null,
    created_at: "2026-11-10T09:25:05Z"
  },
  {
    id: 118,
    customer_name: "Zara Sheikh",
    customer_contact: "zara.s@example.com",
    text: "The web app crashes on checkout when attempting to pay with Apple Pay on Safari.",
    category: "bug",
    sentiment: "frustrated",
    urgency: "high",
    analysis_source: "ai",
    status: "new",
    incident_id: null,
    created_at: "2026-11-10T09:32:40Z"
  },
  {
    id: 119,
    customer_name: "Waleed Khan",
    customer_contact: "waleed@example.com",
    text: "Received defective item in order #8491, requesting refund or replacement.",
    category: "other",
    sentiment: "negative",
    urgency: "medium",
    analysis_source: "ai",
    status: "new",
    incident_id: null,
    created_at: "2026-11-10T09:40:15Z"
  },
  {
    id: 120,
    customer_name: "Faiza Rehman",
    customer_contact: "faiza.r@example.com",
    text: "Thank you for the quick resolution on my earlier ticket, customer service was helpful!",
    category: "other",
    sentiment: "positive",
    urgency: "low",
    analysis_source: "ai",
    status: "resolved",
    incident_id: null,
    created_at: "2026-11-10T09:48:30Z"
  }
];

let mockIncidents = [
  {
    id: 1,
    title: "Payment gateway webhook timeouts causing phantom deductions",
    affected_service: "Payments",
    status: "suggested",
    priority: "high",
    assigned_team: null,
    complaint_count: 5,
    summary: "Multiple customers report credit card deductions during checkout where orders fail to create and users encounter 504 Gateway errors.",
    shared_symptoms: [
      "Payment deducted from bank/card",
      "No order confirmation or receipt",
      "Cart remains unemptied / order stuck pending",
      "504 Gateway Timeout during callback"
    ],
    evidence: [
      {
        complaint_a: 101,
        complaint_b: 102,
        similarity: 0.88,
        reason: "Both describe monetary deduction from credit card accompanied by gateway timeout without order creation."
      },
      {
        complaint_a: 101,
        complaint_b: 103,
        similarity: 0.84,
        reason: "Both report debited accounts while the shopping cart remained populated and unconfirmed."
      },
      {
        complaint_a: 102,
        complaint_b: 104,
        similarity: 0.81,
        reason: "Both received immediate bank notification SMS while the web interface spun into a timeout state."
      },
      {
        complaint_a: 104,
        complaint_b: 105,
        similarity: 0.79,
        reason: "Both experienced failure at final OTP verification phase resulting in missing receipts."
      }
    ],
    hypotheses: [
      {
        text: "Payment gateway callback webhook endpoint is dropping connections or exceeding 10s timeout limit under morning traffic burst.",
        confidence: "high",
        cited_complaint_ids: [101, 102, 104]
      },
      {
        text: "Distributed transaction failure between payment service and order persistence queue leaving captured transactions unassociated.",
        confidence: "medium",
        cited_complaint_ids: [103, 105]
      }
    ],
    suggested_actions: [
      "Inspect payment gateway webhook ingress logs for HTTP 504 and 502 responses",
      "Verify connection pool capacity on order-service database cluster",
      "Run reconciliation job to match captured transaction IDs with pending order draft IDs",
      "Check Redis session lock expiration timing during third-party gateway redirects"
    ],
    history: [
      {
        from_status: null,
        to_status: "suggested",
        actor: "system (AI cluster)",
        note: "Automatically grouped 5 high-similarity complaints with semantic score > 0.78",
        at: "2026-11-10T07:40:00Z"
      }
    ],
    new_matching_complaints: 0,
    created_at: "2026-11-10T07:40:00Z",
    updated_at: "2026-11-10T07:40:00Z",
    resolved_at: null
  },
  {
    id: 2,
    title: "OAuth 2.0 token expiration loop on mobile clients",
    affected_service: "Authentication",
    status: "open",
    priority: "critical",
    assigned_team: "Auth Platform",
    complaint_count: 3,
    summary: "iOS mobile clients are experiencing immediate session invalidation post-login due to malformed refresh token timestamps.",
    shared_symptoms: [
      "Logged out every 30 seconds",
      "Immediate session expiry after 2FA",
      "Invalid token loop on iOS 4.2"
    ],
    evidence: [
      {
        complaint_a: 106,
        complaint_b: 107,
        similarity: 0.89,
        reason: "Both detail immediate session termination following authentication flow."
      },
      {
        complaint_a: 107,
        complaint_b: 108,
        similarity: 0.85,
        reason: "Both pinpoint 2FA token expiration on mobile clients."
      }
    ],
    hypotheses: [
      {
        text: "Recent v4.2 iOS build sets JWT exp claim with millisecond timestamp instead of Unix epoch seconds.",
        confidence: "high",
        cited_complaint_ids: [106, 108]
      }
    ],
    suggested_actions: [
      "Check JWT validation logs on Auth Gateway",
      "Review mobile client release 4.2 auth header formatting",
      "Deploy hotfix patch to tolerate 13-digit epoch timestamps"
    ],
    history: [
      {
        from_status: null,
        to_status: "suggested",
        actor: "system",
        note: "AI detected 3 critical auth failure reports",
        at: "2026-11-10T08:25:00Z"
      },
      {
        from_status: "suggested",
        to_status: "open",
        actor: "m.hasnain",
        note: "Confirmed urgent incident. Assigned to Auth Platform team.",
        at: "2026-11-10T08:30:15Z"
      }
    ],
    new_matching_complaints: 0,
    created_at: "2026-11-10T08:25:00Z",
    updated_at: "2026-11-10T08:30:15Z",
    resolved_at: null
  },
  {
    id: 3,
    title: "Transactional email dispatch delay for order confirmations",
    affected_service: "Notifications",
    status: "investigating",
    priority: "medium",
    assigned_team: "Communications Ops",
    complaint_count: 2,
    summary: "Order confirmation emails are queueing with up to 45-minute dispatch latency due to third-party SMTP throttling.",
    shared_symptoms: [
      "Missing confirmation email",
      "Order visible in dashboard but no receipt sent"
    ],
    evidence: [
      {
        complaint_a: 109,
        complaint_b: 110,
        similarity: 0.83,
        reason: "Both users note missing receipt emails for completed orders."
      }
    ],
    hypotheses: [
      {
        text: "SendGrid rate limits triggered by batch marketing email overlap with transactional email queue.",
        confidence: "medium",
        cited_complaint_ids: [109, 110]
      }
    ],
    suggested_actions: [
      "Separate transactional mail IP pool from marketing campaigns",
      "Check RabbitMQ notification queue depth"
    ],
    history: [
      {
        from_status: null,
        to_status: "suggested",
        actor: "system",
        note: "Grouped notification delay tickets",
        at: "2026-11-10T08:55:00Z"
      },
      {
        from_status: "suggested",
        to_status: "open",
        actor: "sohail",
        note: "Approved for investigation",
        at: "2026-11-10T09:00:00Z"
      },
      {
        from_status: "open",
        to_status: "investigating",
        actor: "sohail",
        note: "Investigating SMTP connection limits",
        at: "2026-11-10T09:15:00Z"
      }
    ],
    new_matching_complaints: 0,
    created_at: "2026-11-10T08:55:00Z",
    updated_at: "2026-11-10T09:15:00Z",
    resolved_at: null
  },
  {
    id: 4,
    title: "Promotional discount calculation rounding error at checkout",
    affected_service: "Billing",
    status: "resolved",
    priority: "low",
    assigned_team: "Billing Core",
    complaint_count: 2,
    summary: "Fixed coupon rounding error on percentage-based discount codes.",
    shared_symptoms: [
      "Coupon percent calculating wrong cents",
      "Discount truncation on summary"
    ],
    evidence: [
      {
        complaint_a: 111,
        complaint_b: 112,
        similarity: 0.87,
        reason: "Both describe discount code math discrepancy."
      }
    ],
    hypotheses: [
      {
        text: "Integer floor division applied before float currency conversion.",
        confidence: "high",
        cited_complaint_ids: [111, 112]
      }
    ],
    suggested_actions: [
      "Deploy rounding precision patch in pricing microservice",
      "Refund affected cent discrepancies"
    ],
    history: [
      {
        from_status: "investigating",
        to_status: "resolved",
        actor: "hasnain",
        note: "Hotfix deployed to pricing service. Rounding precision adjusted.",
        at: "2026-11-10T06:00:00Z"
      }
    ],
    // Has 2 new matching complaints arrived after resolution (Complaints 113, 114)
    new_matching_complaints: 2,
    created_at: "2026-11-10T05:00:00Z",
    updated_at: "2026-11-10T06:00:00Z",
    resolved_at: "2026-11-10T06:00:00Z"
  }
];

// Helper mock storage API that simulates backend behaviour
export const mockStore = {
  getComplaints(params = {}) {
    let items = [...mockComplaints];

    if (params.status) {
      items = items.filter(c => c.status === params.status);
    }
    if (params.category) {
      items = items.filter(c => c.category === params.category);
    }
    if (params.sentiment) {
      items = items.filter(c => c.sentiment === params.sentiment);
    }
    if (params.incident_id !== undefined && params.incident_id !== null && params.incident_id !== '') {
      items = items.filter(c => c.incident_id === Number(params.incident_id));
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      items = items.filter(c =>
        c.customer_name.toLowerCase().includes(q) ||
        c.text.toLowerCase().includes(q) ||
        (c.customer_contact && c.customer_contact.toLowerCase().includes(q)) ||
        c.id.toString().includes(q)
      );
    }

    // Sort newest first
    items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const page = Number(params.page) || 1;
    const size = Number(params.size) || 20;
    const total = items.length;
    const start = (page - 1) * size;
    const paginatedItems = items.slice(start, start + size);

    return {
      items: paginatedItems,
      total,
      page,
      size
    };
  },

  getComplaint(id) {
    const item = mockComplaints.find(c => c.id === Number(id));
    if (!item) {
      const err = new Error("Complaint not found");
      err.code = "not_found";
      throw err;
    }
    return { ...item };
  },

  submitComplaint({ customer_name, customer_contact, text }) {
    if (!customer_name || customer_name.length < 2 || customer_name.length > 80) {
      const err = new Error("Customer name must be between 2 and 80 characters");
      err.code = "validation_error";
      throw err;
    }
    if (!text || text.length < 10 || text.length > 2000) {
      const err = new Error("Complaint text must be between 10 and 2000 characters");
      err.code = "validation_error";
      throw err;
    }

    // AI Categorization heuristic simulation
    let category = "other";
    let sentiment = "neutral";
    let urgency = "medium";
    let incident_id = null;
    let status = "new";

    const lower = text.toLowerCase();
    if (lower.includes("pay") || lower.includes("card") || lower.includes("charge") || lower.includes("deduct") || lower.includes("money") || lower.includes("bank")) {
      category = "payment";
      urgency = "high";
      sentiment = "frustrated";
      // Simulated AI links to incident 1
      incident_id = 1;
      status = "linked";
    } else if (lower.includes("login") || lower.includes("password") || lower.includes("2fa") || lower.includes("token") || lower.includes("session")) {
      category = "login";
      urgency = "critical";
      sentiment = "frustrated";
      incident_id = 2;
      status = "linked";
    } else if (lower.includes("email") || lower.includes("delivery") || lower.includes("order #") || lower.includes("ship")) {
      category = "delivery";
      urgency = "medium";
      sentiment = "negative";
      incident_id = 3;
      status = "linked";
    } else if (lower.includes("coupon") || lower.includes("discount") || lower.includes("bill")) {
      category = "billing";
      urgency = "low";
      sentiment = "negative";
    } else if (lower.includes("crash") || lower.includes("bug") || lower.includes("error")) {
      category = "bug";
      urgency = "high";
      sentiment = "frustrated";
    }

    const newId = Math.max(...mockComplaints.map(c => c.id), 100) + 1;
    const newComplaint = {
      id: newId,
      customer_name,
      customer_contact: customer_contact || null,
      text,
      category,
      sentiment,
      urgency,
      analysis_source: "ai",
      status,
      incident_id,
      created_at: new Date().toISOString()
    };

    mockComplaints.unshift(newComplaint);

    if (incident_id) {
      const inc = mockIncidents.find(i => i.id === incident_id);
      if (inc) {
        inc.complaint_count += 1;
        inc.updated_at = new Date().toISOString();
      }
    }

    return newComplaint;
  },

  importCsv(rows) {
    let imported = 0;
    let failed = 0;
    const errors = [];

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const { customer_name, customer_contact, text } = row;

      if (!customer_name || customer_name.length < 2) {
        failed++;
        errors.push({ row: rowNum, message: "customer_name too short or missing" });
        return;
      }
      if (!text || text.length < 10) {
        failed++;
        errors.push({ row: rowNum, message: "text too short (min 10 characters)" });
        return;
      }

      this.submitComplaint({
        customer_name,
        customer_contact: customer_contact || "",
        text
      });
      imported++;
    });

    return {
      imported,
      failed,
      errors
    };
  },

  getIncidents(params = {}) {
    let items = [...mockIncidents];

    if (params.status) {
      items = items.filter(i => i.status === params.status);
    }
    if (params.priority) {
      items = items.filter(i => i.priority === params.priority);
    }

    // Sort: Suggested incidents first, then newest updated
    items.sort((a, b) => {
      if (a.status === 'suggested' && b.status !== 'suggested') return -1;
      if (b.status === 'suggested' && a.status !== 'suggested') return 1;
      return new Date(b.updated_at) - new Date(a.updated_at);
    });

    const page = Number(params.page) || 1;
    const size = Number(params.size) || 20;
    const total = items.length;
    const start = (page - 1) * size;
    const paginatedItems = items.slice(start, start + size).map(inc => ({
      id: inc.id,
      title: inc.title,
      affected_service: inc.affected_service,
      status: inc.status,
      priority: inc.priority,
      assigned_team: inc.assigned_team,
      complaint_count: inc.complaint_count,
      created_at: inc.created_at,
      updated_at: inc.updated_at
    }));

    return {
      items: paginatedItems,
      total,
      page,
      size
    };
  },

  getIncidentDetail(id) {
    const inc = mockIncidents.find(i => i.id === Number(id));
    if (!inc) {
      const err = new Error(`Incident #${id} not found`);
      err.code = "not_found";
      throw err;
    }

    // Attach linked complaints
    const linkedComplaints = mockComplaints.filter(c => c.incident_id === inc.id);

    return {
      ...inc,
      complaints: linkedComplaints
    };
  },

  approveIncident(id, { assigned_team, priority } = {}) {
    const inc = mockIncidents.find(i => i.id === Number(id));
    if (!inc) throw new Error("Incident not found");
    if (inc.status !== 'suggested') {
      const err = new Error(`Incident cannot transition from ${inc.status} to open`);
      err.code = "invalid_transition";
      throw err;
    }

    const prev = inc.status;
    inc.status = 'open';
    if (assigned_team) inc.assigned_team = assigned_team;
    if (priority) inc.priority = priority;
    inc.updated_at = new Date().toISOString();

    inc.history.unshift({
      from_status: prev,
      to_status: 'open',
      actor: 'staff (sohail)',
      note: `Approved AI suggestion${assigned_team ? ` and assigned to ${assigned_team}` : ''}.`,
      at: new Date().toISOString()
    });

    return this.getIncidentDetail(id);
  },

  rejectIncident(id, { reason }) {
    const inc = mockIncidents.find(i => i.id === Number(id));
    if (!inc) throw new Error("Incident not found");
    if (inc.status !== 'suggested') {
      const err = new Error(`Incident cannot move from ${inc.status} to rejected.`);
      err.code = "invalid_transition";
      throw err;
    }
    if (!reason || reason.length < 3 || reason.length > 300) {
      const err = new Error("Reason must be between 3 and 300 characters");
      err.code = "validation_error";
      throw err;
    }

    const prev = inc.status;
    inc.status = 'rejected';
    inc.updated_at = new Date().toISOString();

    // Unlink complaints
    mockComplaints.forEach(c => {
      if (c.incident_id === inc.id) {
        c.incident_id = null;
        c.status = 'new';
      }
    });

    inc.complaint_count = 0;
    inc.history.unshift({
      from_status: prev,
      to_status: 'rejected',
      actor: 'staff (sohail)',
      note: reason,
      at: new Date().toISOString()
    });

    return this.getIncidentDetail(id);
  },

  updateIncident(id, { priority, assigned_team, status }) {
    const inc = mockIncidents.find(i => i.id === Number(id));
    if (!inc) throw new Error("Incident not found");

    if (status && status === 'investigating') {
      if (inc.status !== 'open') {
        const err = new Error(`Cannot transition from ${inc.status} to investigating`);
        err.code = "invalid_transition";
        throw err;
      }
      const prev = inc.status;
      inc.status = 'investigating';
      inc.history.unshift({
        from_status: prev,
        to_status: 'investigating',
        actor: 'staff (sohail)',
        note: 'Marked as investigating root cause.',
        at: new Date().toISOString()
      });
    }

    if (priority) inc.priority = priority;
    if (assigned_team !== undefined) inc.assigned_team = assigned_team;
    inc.updated_at = new Date().toISOString();

    return this.getIncidentDetail(id);
  },

  resolveIncident(id, { resolution_note }) {
    const inc = mockIncidents.find(i => i.id === Number(id));
    if (!inc) throw new Error("Incident not found");
    if (inc.status !== 'open' && inc.status !== 'investigating') {
      const err = new Error(`Incident cannot move from ${inc.status} to resolved.`);
      err.code = "invalid_transition";
      throw err;
    }
    if (!resolution_note || resolution_note.length < 3 || resolution_note.length > 500) {
      const err = new Error("Resolution note must be between 3 and 500 characters");
      err.code = "validation_error";
      throw err;
    }

    const prev = inc.status;
    inc.status = 'resolved';
    const nowIso = new Date().toISOString();
    inc.resolved_at = nowIso;
    inc.updated_at = nowIso;

    // Resolving updates all linked complaints at once!
    mockComplaints.forEach(c => {
      if (c.incident_id === inc.id) {
        c.status = 'resolved';
      }
    });

    inc.history.unshift({
      from_status: prev,
      to_status: 'resolved',
      actor: 'staff (sohail)',
      note: resolution_note,
      at: nowIso
    });

    return this.getIncidentDetail(id);
  },

  reopenIncident(id, { note }) {
    const inc = mockIncidents.find(i => i.id === Number(id));
    if (!inc) throw new Error("Incident not found");
    if (inc.status !== 'resolved') {
      const err = new Error(`Incident cannot move from ${inc.status} to open.`);
      err.code = "invalid_transition";
      throw err;
    }

    const prev = inc.status;
    inc.status = 'open';
    inc.resolved_at = null;
    const nowIso = new Date().toISOString();
    inc.updated_at = nowIso;

    // Fold in any new matching recurrence complaints
    mockComplaints.forEach(c => {
      if (c.status === 'possible_recurrence') {
        c.incident_id = inc.id;
        c.status = 'linked';
        inc.complaint_count += 1;
      }
    });

    inc.new_matching_complaints = 0;
    inc.history.unshift({
      from_status: prev,
      to_status: 'open',
      actor: 'staff (sohail)',
      note: note || "Reopened incident due to recurrence of symptoms.",
      at: nowIso
    });

    return this.getIncidentDetail(id);
  },

  getDashboardStats() {
    const total_complaints = mockComplaints.length;
    const active_incidents = mockIncidents.filter(i => ['suggested', 'open', 'investigating'].includes(i.status)).length;
    const high_priority_incidents = mockIncidents.filter(i => ['high', 'critical'].includes(i.priority) && i.status !== 'resolved' && i.status !== 'rejected').length;
    const pending_suggestions = mockIncidents.filter(i => i.status === 'suggested').length;

    const sentiment = {
      positive: mockComplaints.filter(c => c.sentiment === 'positive').length,
      neutral: mockComplaints.filter(c => c.sentiment === 'neutral').length,
      negative: mockComplaints.filter(c => c.sentiment === 'negative').length,
      frustrated: mockComplaints.filter(c => c.sentiment === 'frustrated').length
    };

    const categories = ['payment', 'login', 'delivery', 'billing', 'performance', 'bug', 'account', 'other'];
    const by_category = categories.map(cat => ({
      category: cat,
      count: mockComplaints.filter(c => c.category === cat).length
    })).filter(item => item.count > 0);

    const per_day = [
      { date: "2026-11-06", count: 8 },
      { date: "2026-11-07", count: 12 },
      { date: "2026-11-08", count: 15 },
      { date: "2026-11-09", count: 18 },
      { date: "2026-11-10", count: mockComplaints.length }
    ];

    const recent_complaints = [...mockComplaints]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);

    const active_incident_list = mockIncidents
      .filter(i => ['suggested', 'open', 'investigating'].includes(i.status))
      .slice(0, 5)
      .map(i => ({
        id: i.id,
        title: i.title,
        affected_service: i.affected_service,
        status: i.status,
        priority: i.priority,
        assigned_team: i.assigned_team,
        complaint_count: i.complaint_count,
        created_at: i.created_at,
        updated_at: i.updated_at
      }));

    return {
      total_complaints,
      active_incidents,
      high_priority_incidents,
      pending_suggestions,
      sentiment,
      by_category,
      per_day,
      recent_complaints,
      active_incident_list
    };
  },

  getGraphData() {
    const nodes = [];
    const edges = [];

    mockIncidents.forEach(inc => {
      nodes.push({
        id: `i${inc.id}`,
        type: "incident",
        label: `${inc.affected_service}: #${inc.id}`,
        title: inc.title,
        priority: inc.priority,
        status: inc.status
      });
    });

    mockComplaints.forEach(c => {
      nodes.push({
        id: `c${c.id}`,
        type: "complaint",
        label: `#${c.id}`,
        customer: c.customer_name,
        category: c.category,
        sentiment: c.sentiment
      });

      if (c.incident_id) {
        edges.push({
          source: `c${c.id}`,
          target: `i${c.incident_id}`,
          score: 0.85
        });
      }
    });

    return { nodes, edges };
  }
};
