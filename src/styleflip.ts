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
        
        // determine what type of file we are on
        let document = activeTextEditor.document;
        switch( document.languageId ) {
            case 'typescript':            
            case 'javascript':
            case 'typescriptreact':
            case 'javascriptreact':
                this.flipToStyleFile( document );
                break;

            case 'scss':
            case 'css':
                this.flipFromStyleFile( document );
                break;
        }
    }

    private async flipToStyleFile( document: vscode.TextDocument ): Promise< void > {
        let imports = Utils.findAllImports( document.getText() );
                
        if ( imports.length == 1 ) {
            this.completeFlipToStyleFile( imports[0].fileName, document );
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
                    this.completeFlipToStyleFile( pick.importStatement.fileName, document );

            } catch( e ) {
                console.log( 'caught pick exception', e );
            }
        }
        else {
            vscode.window.setStatusBarMessage( '-- Style Flip: No Matching File --', 3000 );
        }
    }

    private completeFlipToStyleFile( fileName: string, document: vscode.TextDocument ) {
        // flip to file and remember where the user came from for flipping back
        let filePath = Utils.createPathToFile( fileName, document.fileName );
        Utils.openFileInWorkspace( filePath );
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
