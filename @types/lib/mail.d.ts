export default Mail;
declare class Mail {
    static "__#2@#connection": any;
    static "__#2@#transport"(): any;
    static sendPlainText(to: object, subject: string, text: string): Promise<any>;
    static sendMarkdownTemplate(to: object, subject: string, template: string, context: object): Promise<any>;
}
