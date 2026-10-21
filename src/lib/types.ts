export type CaseRecord={id:string;reference:string;client_id:string;practice:string;subject:string;urgency:string;facts:string;deadline:string|null;opponent:string;status:string;conflict_result:string|null;conflict_checked_at:string|null;created_at:string;submitted_at:string|null;retention_until:string|null;legal_hold:boolean};
export type Message={id:string;case_id:string;sender_id:string;body:string;internal:boolean;created_at:string};
export type DocumentRecord={id:string;name:string;size:number;created_at:string};
export type Task={id:string;title:string;due_at:string;kind:string;completed_at:string|null};
export type Invoice={id:string;number:string;description:string;amount:number;tax_rate:number;status:string;created_at:string};
export type Slot={id:string;starts_at:string;ends_at:string;modes:string[];enabled?:boolean;staff_id?:string};
export type Appointment={id:string;slot_id:string;mode:string;status:string;video_url:string|null;client_id:string;case_id:string|null;availability_slots:Slot|null};
export type Profile={full_name:string;phone:string;company:string;address:string};
