import type { CompositeStore } from "../composite/CompositeStore";

export type Composite = CompositeStore;

// export interface Composite  {

//     style: string;
//     gutters: boolean;
//     tabContainer: any;
//     lockContainer: any;
//     btnContainer: any;
//     members: any[];
//     buttons: any[];
//     operation: string;
//     id: number;
//     parent?: number;
//     cls: ResourceCls;

//     // from console
//     srcNodeRef: any;
//     _connects: any[];
//     _supportingWidgets: any[];
//     params: Record<string, unknown>;
//     config: Record<string, unknown>;
//     owner_user: number;
//     sdnBase: any;
//     sdnDynamic: any;
//     baseClass: string;
//     _inherited: { p: number };
//     ownerDocument: any;
//     ownerDocumentBody: any;
//     domNode: any;
//     containerNode: any;

//     _created: boolean;
//     _started: boolean;
//     cs: any;
//     pe: any;
//     _borderBox: {
//         w: number;
//         h: number;
//     };
//     _contentBox: {
//         l: number;
//         t: number;
//         w: number;
//         h: number;
//     };

//     buildRendering(): void;
//     startup(): void;
//     validateData(): Promise<boolean>;
//     serialize(lunkwill: any): Promise<any>;
//     deserialize(data: any): void;
//     storeRequest(args: any): Promise<any>;
//     lock(): void;
//     unlock(err?: any): void;
//     createObj(edit: boolean): void;
//     onCreateSuccess(data: any, edit: boolean): void;
//     updateObj(): void;
//     deleteObj(): void;
//     refreshObj(): void;
//     suggestDN(value: any): void;
// }
