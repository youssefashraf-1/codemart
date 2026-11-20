import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { cohorts, money } from '../domain';
import { Store } from '../store';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const assistantKeys = { history: 'codemart.chat.v1', apiKey: 'codemart.together.v1' };
export const togetherEndpoint = 'https://api.together.xyz/v1/chat/completions';
export const togetherModel = 'meta-llama/Llama-3.3-70B-Instruct-Turbo';
const greeting: ChatMessage = {
  role: 'assistant',
  content:
    'Hi! I’m the CodeMart assistant. Ask me about cohorts, installments, the digital store, or the finance tools.',
};

function readSession<T>(key: string, fallback: T): T {
  try {
    const value = sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Offline answers used when no Together AI key is set or the request fails. */
export function localAnswer(question: string, store: Store): string {
  const text = question.toLowerCase();
  const has = (...words: string[]) => words.some((word) => text.includes(word));
  if (has('price', 'cost', 'fee', 'installment', 'tuition', 'cohort', 'track', 'enrol')) {
    const lines = cohorts.map(
      (cohort) =>
        `• ${cohort.name} (${cohort.track}, ${cohort.length}): ${money(cohort.price)} — three installments of ${money(cohort.price / 3)}`,
    );
    return `Our cohorts:\n${lines.join('\n')}\nEnroll from the Cohorts page; your invoices then appear in My learning.`;
  }
  if (has('store', 'product', 'course', 'template', 'voucher', 'buy', 'bag', 'cart')) {
    const items = store
      .products()
      .slice(0, 6)
      .map(
        (product) =>
          `• ${product.name} (${product.kind}, ${product.track}): ${money(product.price)}`,
      );
    return `A few things in the digital store:\n${items.join('\n')}\nAdd items to your bag and check out with a test card.`;
  }
  if (has('payroll', 'salary', 'royalt', 'instructor')) {
    return 'Instructors earn a monthly salary plus a royalty on each course sale (a percentage set per instructor). Accounting can adjust allowances and deductions under Finance → Payroll, and export Payroll JSON.';
  }
  if (has('report', 'json', 'export', 'chart', 'budget', 'finance')) {
    return 'The Finance workspace compares fees, store sales, other income and expenses per track (Web, Data, Cyber) in a chart. Pick a month and use Export JSON for the monthly report. Only accounting and admin users can open it.';
  }
  if (has('login', 'log in', 'sign', 'account', 'password', 'demo')) {
    return 'Use the buttons on the Log in page to fill a demo Student, Accounting or Admin account, or create a new student account from Get started.';
  }
  if (has('pay', 'invoice')) {
    return store.canAccess('student')
      ? 'Open My learning → Cohort fees and press “Pay in demo” on an unpaid installment.'
      : 'Students pay their own installments from My learning. Accounting can issue invoices and mark payments under Finance → Student fees.';
  }
  return 'I can help with cohorts and prices, installments, the digital store, payroll and royalties, or the monthly finance report. What would you like to know?';
}

@Component({
  selector: 'app-assistant',
  imports: [FormsModule],
  template: `
    <button
      type="button"
      class="chat-launcher"
      [class.open]="open()"
      [attr.aria-expanded]="open()"
      aria-controls="chat-panel"
      (click)="open.set(!open())"
    >
      <span aria-hidden="true">{{ open() ? '×' : '✦' }}</span>
      <span class="chat-launcher-label">{{ open() ? 'Close' : 'Ask CodeMart' }}</span>
    </button>
    @if (open()) {
      <section id="chat-panel" class="chat-panel" aria-label="CodeMart assistant">
        <header class="chat-head">
          <div>
            <strong>CodeMart assistant</strong>
            <span class="chat-mode">{{ apiKey() ? 'Together AI' : 'Offline helper' }}</span>
          </div>
          <button type="button" class="button light small" (click)="settings.set(!settings())">
            {{ settings() ? 'Done' : 'AI key' }}
          </button>
        </header>
        @if (settings()) {
          <form class="chat-settings" (ngSubmit)="saveKey()">
            <label
              >Together AI API key
              <span class="field-note">Kept in this tab only (session storage).</span>
              <input
                type="password"
                name="apiKey"
                [(ngModel)]="keyDraft"
                autocomplete="off"
                placeholder="Paste key, or leave empty for offline mode"
            /></label>
            <button class="button ink small" type="submit">Save</button>
          </form>
        }
        <ol class="chat-log" #log aria-live="polite">
          @for (message of messages(); track $index) {
            <li class="chat-msg" [class.mine]="message.role === 'user'">{{ message.content }}</li>
          }
          @if (busy()) {
            <li class="chat-msg typing" aria-label="Assistant is typing">
              <span></span><span></span><span></span>
            </li>
          }
        </ol>
        <form class="chat-input" (ngSubmit)="send()">
          <input
            name="question"
            [(ngModel)]="draft"
            placeholder="Ask about fees, courses, payroll…"
            maxlength="500"
            autocomplete="off"
            aria-label="Your question"
          />
          <button class="button ink small" type="submit" [disabled]="busy() || !draft.trim()">
            Send
          </button>
        </form>
        <button type="button" class="chat-clear" (click)="clear()">Clear conversation</button>
      </section>
    }
  `,
})
export class Assistant {
  private readonly store = inject(Store);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  protected readonly open = signal(false);
  protected readonly settings = signal(false);
  protected readonly busy = signal(false);
  // Conversation and key are tab-scoped: private, gone when the tab closes → session storage.
  readonly messages = signal<ChatMessage[]>(readSession(assistantKeys.history, [greeting]));
  readonly apiKey = signal<string>(readSession(assistantKeys.apiKey, ''));
  protected draft = '';
  protected keyDraft = this.apiKey();

  constructor() {
    effect(() => {
      const history = this.messages();
      try {
        sessionStorage.setItem(assistantKeys.history, JSON.stringify(history.slice(-30)));
      } catch {
        // Ignore storage failures.
      }
      queueMicrotask(() => {
        const element = this.log()?.nativeElement;
        if (element) element.scrollTop = element.scrollHeight;
      });
    });
  }

  saveKey() {
    const key = this.keyDraft.trim();
    this.apiKey.set(key);
    try {
      if (key) sessionStorage.setItem(assistantKeys.apiKey, JSON.stringify(key));
      else sessionStorage.removeItem(assistantKeys.apiKey);
    } catch {
      // Ignore storage failures.
    }
    this.settings.set(false);
  }

  clear() {
    this.messages.set([greeting]);
  }

  async send() {
    const question = this.draft.trim();
    if (!question || this.busy()) return;
    this.draft = '';
    this.messages.update((list) => [...list, { role: 'user', content: question }]);
    this.busy.set(true);
    try {
      const answer = this.apiKey()
        ? await this.askTogether().catch(
            () =>
              `${localAnswer(question, this.store)}\n\n(Together AI was unreachable, so this answer came from the offline helper.)`,
          )
        : localAnswer(question, this.store);
      this.messages.update((list) => [...list, { role: 'assistant', content: answer }]);
    } finally {
      this.busy.set(false);
    }
  }

  private async askTogether(): Promise<string> {
    const catalog = this.store
      .products()
      .map(
        (product) => `${product.name} (${product.kind}, ${product.track}) ${money(product.price)}`,
      )
      .join('; ');
    const programs = cohorts
      .map(
        (cohort) =>
          `${cohort.name} (${cohort.track}, ${cohort.length}) ${money(cohort.price)} in 3 installments`,
      )
      .join('; ');
    // Only public catalog facts and the visitor's role are shared, never personal details.
    const system = `You are the helpful assistant of CodeMart, a coding bootcamp and digital store. Answer briefly. Cohorts: ${programs}. Store: ${catalog}. Instructors receive salaries plus royalties on course sales. The finance dashboard compares fees and store sales per track and exports monthly JSON reports. The visitor is ${this.store.user()?.role ?? 'a guest'}.`;
    const response = await fetch(togetherEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey()}` },
      body: JSON.stringify({
        model: togetherModel,
        max_tokens: 400,
        messages: [{ role: 'system', content: system }, ...this.messages().slice(-10)],
      }),
    });
    if (!response.ok) throw new Error(`Together AI responded ${response.status}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('Empty answer');
    return content.trim();
  }
}
