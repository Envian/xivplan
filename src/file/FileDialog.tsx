import {
    ConstrainMode,
    DefaultButton,
    DetailsList,
    DetailsListLayoutMode,
    DialogFooter,
    IColumn,
    IDetailsListStyles,
    IModalProps,
    IStyle,
    IStyleFunctionOrObject,
    mergeStyleSets,
    Pivot,
    PivotItem,
    PrimaryButton,
    Selection,
    SelectionMode,
    Spinner,
    TextField,
    Theme,
    useTheme,
} from '@fluentui/react';
import { useConst, useForceUpdate } from '@fluentui/react-hooks';
import React, { useCallback, useMemo, useState } from 'react';
import { useAsync } from 'react-async';
import { BaseDialog, IBaseDialogStyles } from '../BaseDialog';
import { useIsDirty, useSetSavedState } from '../DirtyProvider';
import { openFile, saveFile } from '../file';
import { FileSource, useLoadScene, useScene } from '../SceneProvider';
import { confirmOverwriteFile, confirmUnsavedChanges } from './FilePrompts';
import { FileEntry, listLocalFiles } from './localFile';

const classNames = mergeStyleSets({
    tab: {
        minHeight: 200,
        display: 'grid',
        gridTemplateRows: '1fr auto',
        gridTemplateAreas: `
            "content"
            "footer"
        `,
    } as IStyle,
    form: {
        gridArea: 'content',
        marginTop: 20,
    } as IStyle,
    footer: {
        gridArea: 'footer',
    } as IStyle,
});

export const OpenDialog: React.FC<IModalProps> = (props) => {
    return (
        <BaseDialog headerText="Open File" {...props} dialogStyles={dialogStyles}>
            <Pivot>
                <PivotItem headerText="Browser Storage" className={classNames.tab}>
                    <OpenLocalFile onDismiss={props.onDismiss} />
                </PivotItem>
                {/* <PivotItem headerText="GitHub Gist" className={classNames.tab}>
                    <p>TODO</p>
                </PivotItem> */}
            </Pivot>
        </BaseDialog>
    );
};

export const SaveAsDialog: React.FC<IModalProps> = (props) => {
    return (
        <BaseDialog headerText="Save As" {...props} dialogStyles={dialogStyles}>
            <Pivot>
                <PivotItem headerText="Browser Storage" className={classNames.tab}>
                    <SaveLocalFile onDismiss={props.onDismiss} />
                </PivotItem>
                {/* <PivotItem headerText="GitHub Gist" className={classNames.tab}>
                    <p>TODO</p>
                </PivotItem> */}
            </Pivot>
        </BaseDialog>
    );
};

const dialogStyles: IStyleFunctionOrObject<Theme, IBaseDialogStyles> = {
    body: {
        minWidth: 500,
    },
};

interface SourceTabProps {
    onDismiss?: () => void;
}

const openFileColumns: IColumn[] = [
    {
        key: 'name',
        name: 'Name',
        fieldName: 'name',
        minWidth: 200,
    },
    {
        key: 'modified',
        name: 'Date modified',
        fieldName: 'lastModified',
        minWidth: 200,
        onRender: (item: FileEntry) => item.lastEdited?.toLocaleString(),
    },
];

const listStyles: Partial<IDetailsListStyles> = {
    root: {
        overflowX: 'auto',
        width: '100%',
        '& [role=grid]': {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'start',
            maxHeight: '50vh',
        } as IStyle,
    },
    headerWrapper: {
        flex: '0 0 auto',
    },
    contentWrapper: {
        flex: '1 1 auto',
        overflowX: 'hidden',
        overflowY: 'auto',
    },
};

const OpenLocalFile: React.FC<SourceTabProps> = ({ onDismiss }) => {
    const { data: files, error, isPending } = useAsync(listLocalFiles);
    const loadScene = useLoadScene();
    const setSavedState = useSetSavedState();
    const isDirty = useIsDirty();
    const theme = useTheme();

    const forceUpdate = useForceUpdate();
    const selection = useConst(() => new Selection({ onSelectionChanged: forceUpdate }));

    const openCallback = useCallback(async () => {
        if (isDirty) {
            if (!(await confirmUnsavedChanges(theme))) {
                return;
            }
        }

        const index = selection.getSelectedIndices()[0] ?? 0;
        const name = files?.[index]?.name;
        if (!name) {
            return;
        }

        const source: FileSource = { type: 'local', name };
        const scene = await openFile(source);

        loadScene(scene, source);
        setSavedState(scene);
        onDismiss?.();
    }, [selection, files, isDirty, theme, onDismiss, useSetSavedState]);

    if (isPending) {
        return <Spinner />;
    }
    if (error) {
        return <p>{error.message}</p>;
    }
    if (!files) {
        return null;
    }

    return (
        <>
            <DetailsList
                columns={openFileColumns}
                items={files}
                layoutMode={DetailsListLayoutMode.fixedColumns}
                constrainMode={ConstrainMode.unconstrained}
                selectionMode={SelectionMode.single}
                selection={selection}
                styles={listStyles}
                compact
            />
            <DialogFooter className={classNames.footer}>
                <PrimaryButton text="Open" disabled={selection.count === 0} onClick={openCallback} />
                <DefaultButton text="Cancel" onClick={onDismiss} />
            </DialogFooter>
        </>
    );
};

function getInitialName(source: FileSource | undefined) {
    return source?.type === 'local' ? source.name : undefined;
}

const SaveLocalFile: React.FC<SourceTabProps> = ({ onDismiss }) => {
    const setSavedState = useSetSavedState();
    const files = useAsync(listLocalFiles);
    const { scene, source, dispatch } = useScene();
    const [name, setName] = useState(getInitialName(source));
    const theme = useTheme();

    const alreadyExists = useMemo(() => files.data?.some((f) => f.name === name), [files.data, name]);
    const canSave = !!name && !files.isPending;

    const saveCallback = useCallback(async () => {
        if (!canSave) {
            return;
        }

        if (alreadyExists) {
            if (!(await confirmOverwriteFile(theme))) {
                return;
            }
        }

        const source: FileSource = { type: 'local', name };
        await saveFile(scene, source);

        dispatch({ type: 'setSource', source });
        setSavedState(scene);
        onDismiss?.();
    }, [scene, name, canSave, alreadyExists, theme, dispatch, onDismiss, setSavedState]);

    const onKeyPress = useCallback(
        (ev: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if (ev.key === 'Enter') {
                saveCallback();
            }
        },
        [saveCallback],
    );

    const save = useAsync({ deferFn: saveCallback });

    if (save.isPending) {
        return <Spinner />;
    }

    return (
        <>
            <div className={classNames.form}>
                <TextField
                    label="File name"
                    value={name}
                    onChange={(e, v) => setName(v)}
                    onKeyPress={onKeyPress}
                    errorMessage={alreadyExists ? 'A file with this name already exists.' : undefined}
                />
            </div>

            <DialogFooter className={classNames.footer}>
                <PrimaryButton text="Save" disabled={!canSave} onClick={save.run} />
                <DefaultButton text="Cancel" onClick={onDismiss} />
            </DialogFooter>
        </>
    );
};
