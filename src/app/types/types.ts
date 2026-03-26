export type ServiceResponseT = {
  data: ServiceByIdT[];
};

export type ServiceByIdT = {
  id: number;
  name: string;
  type: string;
  categories: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProfessionalResponseT = {
  data: ProfessionalByIdT[];
};

export type ProfessionalByIdT = {
  id: number;
  name: string;
  email: string;
  status: string;
  title: string;
  phone: string;
  office_phone: string;
  organization: string;
  state: string;
  address: string;
  website: string;
  service: ServiceByIdT;
  description: string;
  note: string;
  created_at: string;
  updated_at: string;
};
export type QuestionByServiceResponseId = {
  data: QuestionByServiceResponseIdT[];
};
export type QuestionByServiceResponseIdT = {
  id: number;
  title: string;
  type: "Simple" | "Multiple";
  answers: QuestionByServiceResponseIdAnswersT[] | [];
  status: string;
  created_at: string;
  updated_at: string;
};
export type QuestionByServiceResponseIdAnswersT = {
  id: number;
  text: string;
};
export type TLink = {
  first: string;
  last: string;
  prev: string;
  next: string | null;
};
export type TMeta = {
  current_page: number;
  from: number;
  last_page: number;
  links: {
    url: string | null;
    label: string;
    active: boolean;
  }[];
  path: string;
  per_page: number;
  to: number;
  total: number;
};
export type WorkflowByIdT = {
  id: number;
  service_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};
export type AnswerByIdT = {
  id: number;
  question: QuestionByServiceResponseIdT;
  answer: string;
};

export type ServiceAllResponseT = {
  data: ServiceAllResponseTData[];
  links: TLink;
  meta: TMeta;
};

export type ServiceAllResponseTData = {
  id: number;
  name: string;
  type: string;
  categories: {
    id: number;
    name: string;
    slug: string;
  };
  status: string;
  created_at: string;
  updated_at: string;
};

export type sfgNavDataT = {
  name: string;
  complete: boolean;
  title: string;
  extra: string;
};

export type sfgDataT =
  | {
      id?: number;
      key?: string;
      value?: string;
      extra?: string;
      extra_value?: string;
      created_at?: string;
      updated_at?: string;
    }[]
  | [];
export type sfgPostDataApiT = (
  data: {
    details:
      | {
          key: string;
          value: string;
          extra: string;
          extra_value?: string | number;
        }[]
      | undefined;
  },
  nextStep: { mainId: number; sub: string }
) => Promise<void>;
