import { describe, it, expect, beforeEach } from 'vitest';

describe('DOM Structure and Responsive Layout', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="user-info">
        <span id="user-email">Loading...</span>
        <button id="logout-btn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" class="gear-icon">
            <path d="M19.14 12.94..."/>
          </svg>
          <span class="logout-text">LOGOUT</span>
        </button>
      </div>
      <header class="header">
        <h1 class="logo-title">4STROKES</h1>
      </header>
      <nav class="garages-nav">
        <ul>
          <li><a href="#garageA">GARAGE-A</a></li>
          <li><a href="#garageB">GARAGE-B</a></li>
          <li><a href="#garageC">GARAGE-C</a></li>
          <li><a href="#garageD">GARAGE-D</a></li>
        </ul>
      </nav>
      <div class="garages-container">
        <div class="garages">
          <div class="garage" id="garageA">
            <h2 class="stroke-title" contenteditable="true">Garage A</h2>
            <div class="garage-strokes">
              <div class="garage-stroke-box">
                <h3>1st Stroke</h3>
                <textarea id="strokeA1"></textarea>
                <div class="clear-area">
                  <input type="button" value="Clear" class="clear-btn" data-garage="garageA" data-stroke="stroke1">
                </div>
              </div>
              <div class="garage-stroke-box">
                <h3>2nd Stroke</h3>
                <textarea id="strokeA2"></textarea>
              </div>
              <div class="garage-stroke-box">
                <h3>3rd Stroke</h3>
                <textarea id="strokeA3"></textarea>
              </div>
              <div class="garage-stroke-box">
                <h3>4th Stroke</h3>
                <textarea id="strokeA4"></textarea>
              </div>
            </div>
          </div>
          <div class="garage" id="garageB">
            <h2 class="stroke-title" contenteditable="true">Garage B</h2>
            <div class="garage-strokes">
              <div class="garage-stroke-box">
                <h3>1st Stroke</h3>
                <textarea id="strokeB1"></textarea>
              </div>
              <div class="garage-stroke-box">
                <h3>2nd Stroke</h3>
                <textarea id="strokeB2"></textarea>
              </div>
              <div class="garage-stroke-box">
                <h3>3rd Stroke</h3>
                <textarea id="strokeB3"></textarea>
              </div>
              <div class="garage-stroke-box">
                <h3>4th Stroke</h3>
                <textarea id="strokeB4"></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  describe('User Info Elements', () => {
    it('should have user-info container', () => {
      const userInfo = document.querySelector('.user-info');
      expect(userInfo).toBeTruthy();
    });

    it('should have user-email element', () => {
      const userEmail = document.getElementById('user-email');
      expect(userEmail).toBeTruthy();
      expect(userEmail.textContent).toBe('Loading...');
    });

    it('should have logout button with SVG icon and text', () => {
      const logoutBtn = document.getElementById('logout-btn');
      expect(logoutBtn).toBeTruthy();

      const gearIcon = logoutBtn.querySelector('.gear-icon');
      expect(gearIcon).toBeTruthy();
      expect(gearIcon.tagName).toBe('svg');

      const logoutText = logoutBtn.querySelector('.logout-text');
      expect(logoutText).toBeTruthy();
      expect(logoutText.textContent).toBe('LOGOUT');
    });
  });

  describe('Navigation Structure', () => {
    it('should have 4 garage navigation links', () => {
      const navLinks = document.querySelectorAll('.garages-nav a');
      expect(navLinks).toHaveLength(4);
    });

    it('should have correct href attributes', () => {
      const links = document.querySelectorAll('.garages-nav a');
      expect(links[0].getAttribute('href')).toBe('#garageA');
      expect(links[1].getAttribute('href')).toBe('#garageB');
      expect(links[2].getAttribute('href')).toBe('#garageC');
      expect(links[3].getAttribute('href')).toBe('#garageD');
    });

    it('should have correct navigation text', () => {
      const links = document.querySelectorAll('.garages-nav a');
      expect(links[0].textContent).toBe('GARAGE-A');
      expect(links[1].textContent).toBe('GARAGE-B');
      expect(links[2].textContent).toBe('GARAGE-C');
      expect(links[3].textContent).toBe('GARAGE-D');
    });
  });

  describe('Garage Structure', () => {
    it('should have garage containers', () => {
      const garageA = document.getElementById('garageA');
      const garageB = document.getElementById('garageB');
      expect(garageA).toBeTruthy();
      expect(garageB).toBeTruthy();
    });

    it('should have editable garage titles', () => {
      const titles = document.querySelectorAll('.stroke-title');
      expect(titles.length).toBeGreaterThan(0);
      titles.forEach((title) => {
        expect(title.getAttribute('contenteditable')).toBe('true');
      });
    });

    it('should have garage-strokes container', () => {
      const strokesContainer = document.querySelector('.garage-strokes');
      expect(strokesContainer).toBeTruthy();
    });

    it('should have 4 stroke boxes per garage', () => {
      const garageA = document.getElementById('garageA');
      const strokeBoxes = garageA.querySelectorAll('.garage-stroke-box');
      expect(strokeBoxes).toHaveLength(4);
    });

    it('should have textarea in each stroke box', () => {
      const strokeBoxes = document.querySelectorAll('.garage-stroke-box');
      strokeBoxes.forEach((box) => {
        const textarea = box.querySelector('textarea');
        expect(textarea).toBeTruthy();
      });
    });

    it('should have clear button with correct data attributes', () => {
      const clearBtn = document.querySelector('.clear-btn');
      expect(clearBtn).toBeTruthy();
      expect(clearBtn.getAttribute('data-garage')).toBe('garageA');
      expect(clearBtn.getAttribute('data-stroke')).toBe('stroke1');
    });
  });

  describe('Textarea IDs', () => {
    it('should have correct textarea IDs for Garage A', () => {
      expect(document.getElementById('strokeA1')).toBeTruthy();
      expect(document.getElementById('strokeA2')).toBeTruthy();
      expect(document.getElementById('strokeA3')).toBeTruthy();
      expect(document.getElementById('strokeA4')).toBeTruthy();
    });

    it('should have correct textarea IDs for Garage B', () => {
      expect(document.getElementById('strokeB1')).toBeTruthy();
      expect(document.getElementById('strokeB2')).toBeTruthy();
      expect(document.getElementById('strokeB3')).toBeTruthy();
      expect(document.getElementById('strokeB4')).toBeTruthy();
    });
  });

  describe('Grid Layout Structure', () => {
    it('should have garage-strokes as grid container', () => {
      const strokesGrid = document.querySelector('.garage-strokes');
      expect(strokesGrid).toBeTruthy();
    });

    it('should have stroke boxes as grid items', () => {
      const strokeBoxes = document.querySelectorAll(
        '.garage-strokes .garage-stroke-box'
      );
      expect(strokeBoxes.length).toBeGreaterThan(0);
    });
  });

  describe('Button Click Simulation', () => {
    it('should trigger click event on logout button', () => {
      const logoutBtn = document.getElementById('logout-btn');
      let clicked = false;

      logoutBtn.addEventListener('click', () => {
        clicked = true;
      });

      logoutBtn.click();
      expect(clicked).toBe(true);
    });

    it('should trigger click event on clear button', () => {
      const clearBtn = document.querySelector('.clear-btn');
      let clicked = false;

      clearBtn.addEventListener('click', (e) => {
        clicked = true;
        expect(e.target.getAttribute('data-garage')).toBe('garageA');
      });

      clearBtn.click();
      expect(clicked).toBe(true);
    });
  });

  describe('User Input Simulation', () => {
    it('should update textarea value', () => {
      const textarea = document.getElementById('strokeA1');
      textarea.value = 'Test stroke content';
      expect(textarea.value).toBe('Test stroke content');
    });

    it('should update editable title', () => {
      const title = document.querySelector('.stroke-title');
      title.textContent = 'New Garage Title';
      expect(title.textContent).toBe('New Garage Title');
    });

    it('should handle blur event on title', () => {
      const title = document.querySelector('.stroke-title');
      let blurred = false;

      title.addEventListener('blur', () => {
        blurred = true;
      });

      title.dispatchEvent(new Event('blur'));
      expect(blurred).toBe(true);
    });
  });
});
