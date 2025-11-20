document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear and reset activity select to avoid duplicate options on re-fetch
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section
        const participants = details.participants || [];
        let participantsHtml = "";
        if (participants.length > 0) {
          participantsHtml = `
            <div class="participants">
              <h5>Participants (${participants.length})</h5>
              <ul class="participants-list">
                ${participants
                  .map(
                    (p) => `
                      <li>
                        <span class="participant-badge">${escapeHtml(p)}</span>
                        <button class="delete-participant" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(p)}" title="Unregister participant">✕</button>
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>
          `;
        } else {
          participantsHtml = `<div class="participants"><p class="no-participants">No participants yet</p></div>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to show the new participant immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Helper to escape HTML so participant names/emails are safe
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Delegate click handler for delete/unregister buttons
  activitiesList.addEventListener("click", async (event) => {
    const btn = event.target.closest(".delete-participant");
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activity || !email) return;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        // Refresh activities to show the removal immediately
        fetchActivities();
      } else {
        console.error("Failed to remove participant", result);
        alert(result.detail || "Failed to remove participant");
      }
    } catch (error) {
      console.error("Error removing participant:", error);
      alert("Error removing participant");
    }
  });

  // Initialize app
  fetchActivities();
});
