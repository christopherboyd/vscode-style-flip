import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as Utils from '../../utils';
import { before } from 'mocha';

const projectPath = path.join( __dirname, '../../..' );
const samplesPath = path.join( projectPath, 'src/test/suite/samples' );
const sampleJS = path.join( samplesPath, 'app.js' );
const sampleSCSS = path.join( samplesPath, 'app.scss' );

suite('Extension Test Suite', () => {
	before(() => {
		vscode.window.showInformationMessage('Start all tests.');
	});

	test('Find Imports', async () => {
		let document = await vscode.workspace.openTextDocument( sampleJS );
		let content = document.getText();

		let imports = Utils.findAllImports( content );
		assert.equal( imports.length, 2, 'Incorrect number of imports' );
		if ( imports.length == 2 )
		{
			let found = imports[0];
			assert.equal( found.importName, 'styles' );
			assert.equal( found.fileName, './App.module.scss' );

			found = imports[1];
			assert.equal( found.importName, 'otherStyles' );
			assert.equal( found.fileName, './SomethingElse.css' );
		}
	});

	test('Open File', async() => {
		let filePath = Utils.createPathToFile( './app.scss', sampleJS );
		let editor = await Utils.openFileInWorkspace( filePath );
		let expectedPath = path.join( samplesPath, './app.scss' );
		assert.equal( editor.document.fileName.toLowerCase(), expectedPath.toLowerCase() );
	})

	test('Find Matching Code File', async() => {
		let match = await Utils.findCodeMatchingStyleName( sampleSCSS );
		assert.equal( match, sampleJS );

		let moduleTest = path.join( samplesPath, 'app.module.scss' );
		match = await Utils.findCodeMatchingStyleName( moduleTest );
		assert.equal( match, sampleJS );

		let missingFile = path.join( samplesPath, 'application.scss' );
		match = await Utils.findCodeMatchingStyleName( missingFile );
		assert.equal( match, undefined );
	});

	test('Parse Class Name At Cursor', async() => {
		// css module like import
		let testModules = '<img src={logo} className={ styles.AppLogo } alt="logo" />';
		
		let found = Utils.parseClassNameAtOffset( testModules, 0 );
		assert.equal( found && found.className, '' );
		assert.equal( found && found.importName, '' );

		found = Utils.parseClassNameAtOffset( testModules, 1 );
		assert.equal( found && found.importName, '' );
		assert.equal( found && found.className, 'img' );

		for ( let offset of [28, 33, 35, 39, 42 ] ) {
			found = Utils.parseClassNameAtOffset( testModules, offset );
			assert.equal( found && found.importName, 'styles' );
			assert.equal( found && found.className, 'AppLogo' );
		}

		// standard style
		let testCSS = '<img src={logo} className="AppLogo" alt="logo" />';
		found = Utils.parseClassNameAtOffset( testCSS, 28 );
		assert.equal( found && found.importName, '' );
		assert.equal( found && found.className, 'AppLogo' );

		// too much hierarchy
		let testInvalid = '<img src={logo} className={ styles.AppLogo.Invalid } alt="logo" />';
		found = Utils.parseClassNameAtOffset( testInvalid, 39 );
		assert.equal( found && found.className, '' );
		assert.equal( found && found.importName, '' );
	});

	test('Find Class Name In File', async() => {
		let position = await Utils.findClassNameInStyleFile( sampleSCSS, 'DoesntExist' );
		assert.equal( position.line, 0 );
		assert.equal( position.character, 0 );

		position = await Utils.findClassNameInStyleFile( sampleSCSS, 'App' );
		assert.equal( position.line, 0 );
		assert.equal( position.character, 0 );

		position = await Utils.findClassNameInStyleFile( sampleSCSS, 'AppLogo' );
		assert.equal( position.line, 8 );
		assert.equal( position.character, 0 );

		position = await Utils.findClassNameInStyleFile( sampleSCSS, 'AppHeaderChild' );
		assert.equal( position.line, 28 );
		assert.equal( position.character, 0 );
	});
});
