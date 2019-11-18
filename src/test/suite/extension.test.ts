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
});
