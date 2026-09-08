type Subscriber = (event: { type: "mail.updated"; userEmail?: string }) => void;

type EventState = { subscribers: Set<Subscriber> };
const globalState = globalThis as typeof globalThis & { __nebulaEvents?: EventState };
const state = globalState.__nebulaEvents ?? { subscribers: new Set<Subscriber>() };
globalState.__nebulaEvents = state;

export function subscribe(subscriber: Subscriber) {
  state.subscribers.add(subscriber);
  return () => state.subscribers.delete(subscriber);
}

export function publishMailUpdate(userEmail?: string) {
  for (const subscriber of state.subscribers) subscriber({ type: "mail.updated", userEmail });
}
