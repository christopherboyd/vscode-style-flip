import * as vscode from 'vscode';
import * as Utils from './utils';

interface QuickPickImport extends vscode.QuickPickItem {
    importStatement: Utils.ImportStatement;
}

export class StyleFlip {
    private styleFileReferrers = new Map< string, string >();

    constructor() {
    }

    public flip() {
        let activeTextEditor = vscode.window.activeTextEditor;
        if ( !activeTextEditor || !activeTextEditor.document )
            return;

        let caretPosition: vscode.Position | undefined;
        if ( activeTextEditor.selection && activeTextEditor.selection.active )
            caretPosition = activeTextEditor.selection.active;        
        
        // determine what type of file we are on
        let document = activeTextEditor.document;
        switch( document.languageId ) {
            case 'typescript':
            case 'javascript':
            case 'typescriptreact':
            case 'javascriptreact':
                this.flipToStyleFile( document, caretPosition );
                break;

            case 'scss':
            case 'css':
                this.flipFromStyleFile( document );
                break;
        }
    }

    private async flipToStyleFile( document: vscode.TextDocument, caretPosition: vscode.Position | undefined ): Promise< void > {
        let imports = Utils.findAllImports( document.getText() );

        // if we have a caret position, check if user is trying to jump to a specific class name definition
        let targetPosition = new vscode.Position( 0, 0 );
        if ( caretPosition )
        {
            let line = Utils.getLineAtPosition( document, caretPosition );
            let className = Utils.parseClassNameAtOffset( line, caretPosition.character );
            let matching = imports.find( element => element.importName == className.importName );
	    
            if ( matching ) {
                let filePath = Utils.createPathToFile( matching.fileName, document.fileName );
                targetPosition = await Utils.findClassNameInStyleFile( filePath, className.className );
                imports = [matching];
            }
        }

        if ( imports.length == 1 ) {
            this.completeFlipToStyleFile( imports[0].fileName, targetPosition, document );
        }
        else if ( imports.length > 1 ) {
            // show options to user
            try {
                let items = imports.map( (value) => {
                    let option: QuickPickImport = { importStatement: value, label: value.fileName, description: value.importName };
                    return option;
                });

                let pick = await vscode.window.showQuickPick( items, {canPickMany: false, placeHolder: 'Choose a style file'} );
                if ( pick )
                    this.completeFlipToStyleFile( pick.importStatement.fileName, targetPosition, document );

            } catch( e ) {
                console.log( 'caught pick exception', e );
            }
        }
        else {
            vscode.window.setStatusBarMessage( '-- Style Flip: No Matching File --', 3000 );
        }
    }

    private completeFlipToStyleFile( fileName: string, position: vscode.Position, document: vscode.TextDocument ) {
        // flip to file and remember where the user came from for flipping back
        let filePath = Utils.createPathToFile( fileName, document.fileName );
        Utils.openFileInWorkspace( filePath, position );
        this.styleFileReferrers.set( filePath, document.fileName );
    }

    private async flipFromStyleFile( document: vscode.TextDocument ): Promise< void > {
        // check if we previoulsy flipped this style file from another file in the project
        let referrer = this.styleFileReferrers.get( document.fileName );
        if ( referrer ) {
            Utils.openFileInWorkspace( referrer );
            return;
        }

        // user hasn't flipped to this style file before. Try to find a javascript/typescript file with the same name
        let match = await Utils.findCodeMatchingStyleName( document.fileName );
        if ( match ) {
            Utils.openFileInWorkspace( match );
            return;
        }

        vscode.window.setStatusBarMessage( '-- Style Flip: No Matching File --', 3000 );
    }
}
