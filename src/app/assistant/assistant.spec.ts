import { TestBed } from '@angular/core/testing';
import { Store } from '../store';
import { isolateStorage } from '../testing';
import { Assistant, assistantKeys, localAnswer, togetherEndpoint } from './assistant';

describe('Assistant chat', () => {
  let restore: () => void;

  beforeEach(() => {
    restore = isolateStorage();
  });
  afterEach(() => restore());

  it('answers common questions offline from catalog data', () => {
    const store = TestBed.inject(Store);
    expect(localAnswer('How much does a cohort cost?', store)).toContain('EGP 12,000');
    expect(localAnswer('What is in the store?', store)).toContain('Angular in Practice');
    expect(localAnswer('how are royalties paid', store)).toContain('royalty');
  });

  it('replies offline without a key and keeps the conversation in session storage', async () => {
    const fixture = TestBed.createComponent(Assistant);
    const chat = fixture.componentInstance;
    const fetchSpy = spyOn(window, 'fetch');
    (chat as unknown as { draft: string }).draft = 'cohort prices?';
    await chat.send();
    fixture.detectChanges();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(chat.messages().length).toBe(3);
    expect(chat.messages()[2].content).toContain('Full-stack Web');
    expect(sessionStorage.getItem(assistantKeys.history)).toContain('cohort prices?');
  });

  it('calls Together AI when a key is saved', async () => {
    const fixture = TestBed.createComponent(Assistant);
    const chat = fixture.componentInstance;
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(
      new Response(JSON.stringify({ choices: [{ message: { content: 'Hello from AI' } }] })),
    );
    (chat as unknown as { keyDraft: string }).keyDraft = 'test-key';
    chat.saveKey();
    expect(sessionStorage.getItem(assistantKeys.apiKey)).toContain('test-key');
    expect(localStorage.getItem(assistantKeys.apiKey)).toBeNull();
    (chat as unknown as { draft: string }).draft = 'hi';
    await chat.send();
    expect(fetchSpy.calls.mostRecent().args[0]).toBe(togetherEndpoint);
    expect(chat.messages().at(-1)?.content).toBe('Hello from AI');
  });

  it('falls back to the offline helper when Together AI fails', async () => {
    const chat = TestBed.createComponent(Assistant).componentInstance;
    spyOn(window, 'fetch').and.resolveTo(new Response('denied', { status: 401 }));
    (chat as unknown as { keyDraft: string }).keyDraft = 'bad-key';
    chat.saveKey();
    (chat as unknown as { draft: string }).draft = 'store products';
    await chat.send();
    expect(chat.messages().at(-1)?.content).toContain('offline helper');
  });
});
