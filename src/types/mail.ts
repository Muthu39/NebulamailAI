export type MailView = "inbox" | "sent" | "compose" | "detail";

export type MailFilter = {
  sender: string;
  keyword: string;
  after: string;
  before: string;
  unread: boolean;
};

export type MailSummary = {
  id: string;
  threadId: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  date: string;
  timestamp: number;
  isUnread: boolean;
  labelIds: string[];
};

export type MailDetail = MailSummary & {
  to: string;
  bodyText: string;
  bodyHtml?: string;
  replyTo?: string;
};

export type ComposeState = {
  to: string;
  cc: string;
  subject: string;
  body: string;
  mode: "new" | "reply" | "forward";
  threadId?: string;
  inReplyTo?: string;
};

export type AppContext = {
  currentView: MailView;
  selectedEmailId?: string;
  selectedEmail?: MailDetail;
  filters: MailFilter;
  searchQuery: string;
  composeState: ComposeState;
  userEmail?: string;
};

export const emptyFilters: MailFilter = {
  sender: "",
  keyword: "",
  after: "",
  before: "",
  unread: false,
};

export const emptyCompose: ComposeState = {
  to: "",
  cc: "",
  subject: "",
  body: "",
  mode: "new",
};
