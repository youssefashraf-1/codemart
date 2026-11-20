import { TestBed } from '@angular/core/testing';
import { Feedback, soundKey } from './feedback';
import { isolateStorage } from './testing';

describe('Feedback service', () => {
  let restore: () => void;
  let feedback: Feedback;

  beforeEach(() => {
    restore = isolateStorage();
    feedback = TestBed.inject(Feedback);
  });
  afterEach(() => restore());

  it('announces success messages and clears them after a delay', () => {
    jasmine.clock().install();
    try {
      feedback.announce('Saved.');
      expect(feedback.status()).toBe('Saved.');
      expect(feedback.tone()).toBe('success');
      jasmine.clock().tick(4300);
      expect(feedback.status()).toBe('');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('turns thrown errors into error announcements', () => {
    feedback.attempt(() => {
      throw new Error('Nope.');
    });
    expect(feedback.status()).toBe('Nope.');
    expect(feedback.tone()).toBe('error');
  });

  it('remembers the sound preference in local storage', () => {
    expect(feedback.sound()).toBeFalse();
    feedback.toggleSound();
    expect(feedback.sound()).toBeTrue();
    expect(localStorage.getItem(soundKey)).toBe('true');
    feedback.toggleSound();
    expect(localStorage.getItem(soundKey)).toBe('false');
  });
});
