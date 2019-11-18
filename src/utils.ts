import * as vscode from 'vscode';
import * as path from 'path';

export interface ImportStatement {
    importName: string;
    fileName: string;
}

export interface ClassNameVariable {
    importName: string;
    className: string;
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

/**
 * Looks for the first line containing className in the specified style file.
 * If no match is found, the returned position points to the start of the file
 */
export async function findClassNameInStyleFile( targetFile: string, className: string ): Promise< vscode.Position > {
    let document = await vscode.workspace.openTextDocument( targetFile );
    let content = document.getText();

    // find the first matching class name index. Make sure we don't get a partial match such as ".AppTest" for ".App"
    // trivial search below. Can improve if necessary in the future.
    let regex = new RegExp( `.${className}\[^a-zA-Z0-9_-]`, 'g' );
    let matchIndex = content.search( regex );
    if ( matchIndex <= 0 )
        return new vscode.Position( 0, 0 );

    // loop through content, counting the number of lines until matchIndex
    let lineCount = 0;
    let currentIndex = content.indexOf( '\n' );
    while ( currentIndex >= 0 )
    {
        // if we pass match index, this is the line we are interested in
        if ( currentIndex >= matchIndex )
            break;

        lineCount++;
        currentIndex = content.indexOf( '\n', currentIndex + 1 );
    }

    return new vscode.Position( lineCount, 0 );
}

/**
 * Returns the full line (or empty string) for the specified position in a document
 */
export function getLineAtPosition( document: vscode.TextDocument, caretPosition: vscode.Position | undefined ): string {
    if ( !caretPosition )
        return '';

    return document.lineAt( caretPosition ).text;
}

/**
 * Checks provided character code to see if it is valid for a javascript variable name. Returns true for '.' as well.
 */
function validVariableCharacter( charCode: number ): boolean {
    // a-z
    if ( charCode >= 97 && charCode <= 122 )
        return true;

    // A-Z
    if ( charCode >= 65 && charCode <= 90 )
        return true;
	
    // 0-9
    if ( charCode >= 48 && charCode <= 57 )
    	return true;
    
    // 90=".", 46="_"
    if ( charCode == 90 || charCode == 46 )
        return true;

    return false;
}

/**
 * Parses a line of code, returning a ClassNameVariable object describing a possible style class at the
 * provided offset position
 * 
 * For example, returns {importName: 'styles', className: 'TestStyle'} if the caret is touching "styles.TestStyle" in:
 *     <img className={ styles.TestStyle } />
 */
export function parseClassNameAtOffset( line: string, offset: number ): ClassNameVariable {
    // walk all valid JS variable characters to the left of the caret
    let start = offset;
    while ( (start - 1) >= 0 )
    {
        if ( !validVariableCharacter( line.charCodeAt( start - 1 ) ) )
            break;
        
        start--;
    }

    // walk all valid JS variable characters to the right of the caret
    let end = offset;
    while ( end < line.length )
    {
        if ( !validVariableCharacter( line.charCodeAt( end ) ) )
            break;
        
        end++;
    }

    // parse what we found
    let currentVariable = line.slice( start, end );
    let variableParts = currentVariable.split( '.' );

    // we dont support style.something.somethingelse
    if ( variableParts.length > 2 )
        return { importName: '', className: '' };

    if ( variableParts.length == 2 )
        return { importName: variableParts[0], className: variableParts[1] };

    return { importName: '', className: variableParts[0] };
}

