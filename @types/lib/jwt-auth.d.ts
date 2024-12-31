export default JwtAuth;
declare class JwtAuth {
    static "__#1@#TOKEN_LIFETIME": number;
    static "__#1@#INACTIVITY_LIMIT": number;
    static "__#1@#approvalFn": (arg0: string) => boolean;
    static set approveRenewal(approvalFunction: any);
    static saveJwt(ctx: object, sub?: number | string, data?: object): Promise<void>;
    static verifyJwt(ctx: object): boolean;
    static cancelJwt(ctx: object): Promise<void>;
}
