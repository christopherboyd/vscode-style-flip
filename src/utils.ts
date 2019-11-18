import * as vscode from 'vscode';
import * as path from 'path';

export interface ImportStatement {
    importName: string;
    fileName: string;
}

/**
 * Searches for javascript & typescript import lines
 */
export function findAllImports( text: string ): ImportStatement[] {
    let results: ImportStatement[] = [];
    
    // regex matches:
    // - import style from './File.scss';
    // - import * as style from './File.scss';
    let regex = /(?<=^|;)\s*import\s+(?:\*\s+as\s+)?(\S+)\s+from\s+'([^']+)'\s*;/g;
    let match = regex.exec( text );
    while ( match ) {
        let fileName = match[2];
        let extension = fileName.substr(fileName.lastIndexOf('.') + 1);
        if ( extension == 'scss' || extension == 'css' )
            results.push( { importName: match[1], fileName } );

        match = regex.exec( text );
    }
    
    return results;
}

/**
 * Builds path to file given reference file
 */
export function createPathToFile( relativePath: string, documentPath: string ): string {
    let directory = path.dirname( documentPath );
    return path.join( directory, relativePath );
}

/**
 * Opens the specified file in VS Code
 */
export async function openFileInWorkspace( file: string, position?: vscode.Position ): Promise< vscode.TextEditor > {
    let uri = vscode.Uri.file( file );

    let options: vscode.TextDocumentShowOptions = {};
    if ( position )
        options.selection = new vscode.Range( position, position );
    
    return await vscode.window.showTextDocument( uri, options );
}

/**
 * Tries to find a matching javascript/typescript file for the provided css file.
 * For example, for 'app.scss' would return 'app.tsx' if that file existed
 */
export async function findCodeMatchingStyleName( targetFile: string ): Promise< string | undefined > {
    // strip extension
    let targetExtension = path.extname( targetFile );
    let baseName = '';
    
    // some css module setups use the '<name>.module.scss' naming pattern    
    const cssModuleExt = '.module.scss';
    if ( targetFile.endsWith( cssModuleExt ) ) {
        baseName = targetFile.slice( 0, -cssModuleExt.length );
    }
    else if ( targetExtension == '.scss' || targetExtension == '.css' ) {
        baseName = targetFile.slice( 0, -targetExtension.length );
    }

    // unknown file
    if ( !baseName )
        return undefined;

    // try all extensions
    for ( let ext of ['tsx', 'jsx', 'ts', 'js'] ) {
        let test = `${baseName}.${ext}`;
        let uri = vscode.Uri.file( test );

        try {
            let exists = await vscode.workspace.fs.stat( uri );
            if ( exists )
                return test;

        } catch( e ) {
            // not found
        }
    }

    return undefined;
}
