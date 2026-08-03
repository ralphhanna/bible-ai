export interface AnnotationTarget {
  strategy: 'id' | 'testId' | 'domPath';
  elementId?: string | null;
  testId?: string | null;
  domPath: string;
  tagName: string;
  textSnippet?: string | null;
  parentText?: string | null;
  columnTitle?: string | null;
}

export interface Annotation {
  id?: string;
  pagePath: string;
  note: string;
  createdAt?: string;
  updatedAt?: string;
  target: AnnotationTarget;
  workflowContext?: Record<string, unknown>;
}

export function buildDomPath(element: Element, root?: Element | null): string;
export function pickStrategy(element: Element): AnnotationTarget['strategy'];
export function cssEscape(value: string): string;
export function nearestHeading(element: Element, root?: Element | null): string | null;
export function tableColumn(element: Element): string | null;
export function describeContext(
  element: Element,
  root?: Element | null,
): Pick<AnnotationTarget, 'parentText' | 'columnTitle'>;
export function describeTarget(element: Element, root?: Element | null): AnnotationTarget;
export function resolveTarget(target: AnnotationTarget, doc?: Document): Element | null;
export function contextSummary(
  target: AnnotationTarget,
  liveElement?: Element | null,
  root?: Element | null,
): string;
export function createAnnotationApi(
  apiUrl?: string,
  fetchImpl?: typeof fetch,
): {
  fetchDocument(): Promise<{ annotations: Annotation[] }>;
  create(annotation: Annotation): Promise<{ annotations: Annotation[] }>;
  replaceDocument(document: { annotations: Annotation[] }): Promise<{ annotations: Annotation[] }>;
  remove(annotationId: string): Promise<null>;
};
