import "./style.css";
import scheduleCsv from "../../schedule.csv?raw";
import { browser } from "wxt/browser";
import {
  parseSchedule,
  findNextPoya,
  iconPathForEntry,
  formatPoyaTitle,
  startOfUTCDate,
  daysBetween,
  abbreviateDetails
} from "../../utils/uposatha";

const app = document.querySelector<HTMLDivElement>("#app")!;

function render() {
  const schedule = parseSchedule(scheduleCsv);
  const now = new Date();
  const next = findNextPoya(schedule, now);

  if (!next) {
    app.innerHTML = `<h1>No upcoming uposatha days found.</h1>`;
    return;
  }

  const { entry, daysUntil } = next;
  const iconPath = iconPathForEntry(entry.type, daysUntil);
  const title = formatPoyaTitle(entry, daysUntil);

  // Filter for remaining uposatha days (including today if it's one)
  const todayStart = startOfUTCDate(now);
  const remainingDays = schedule.filter(e => e.date.getTime() >= todayStart.getTime());

  app.innerHTML = `
    <div class="popup-container">
      <header>
        <h1>Uposatha</h1>
      </header>
      
      <div class="current-uposatha">
        <img src="${browser.runtime.getURL(iconPath as any)}" alt="${entry.type} moon" class="large-icon" />
        <p class="subtitle">${title.replace(/\n/g, '<br/>')}</p>
      </div>

      <div class="upcoming-list">
        <h2>Upcoming</h2>
        <div class="scroll-area">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Details</th>
                <th>Name</th>
                <th>In</th>
              </tr>
            </thead>
            <tbody>
              ${remainingDays.map(e => {
    const diff = daysBetween(todayStart, e.date);
    const isCurrent = e.date.getTime() === entry.date.getTime();
    return `
                  <tr class="${isCurrent ? 'highlight' : ''}">
                    <td>${e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>${e.type}</td>
                    <td>${abbreviateDetails(e.details)}</td>
                    <td>${e.name ?? ''}</td>
                    <td>${diff === 0 ? 'Today' : `${diff}d`}</td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <p class="footer">Your organization’s schedule may be different.</p>
    </div>
  `;
}

render();
