// Canonical DRIFT EditMode test skeleton.
// Modeled on Assets/Tests/EditMode/RuntimeOxygenTests.cs.
//
// KEY CONSTRAINT: Unity does NOT call Awake/Start/Update on script-added
// components in EditMode. Drive the system under test through its extracted
// Tick/Step/Resolve method and explicit Configure(...), never by waiting for a
// lifecycle method. See guides/03-editmode-safe-design.md.
//
// Place under Assets/Tests/EditMode/<Subject>Tests.cs, namespace Drift.Tests.

using System.Collections.Generic;
using Drift.Core.Combat;        // adjust usings to the system under test
using Drift.Core.Survival;
using NUnit.Framework;
using UnityEngine;

namespace Drift.Tests
{
    /// <summary>
    /// EditMode coverage for &lt;SYSTEM&gt;. Drives &lt;Method&gt; directly because Unity
    /// does not run Awake/Update on script-added components in EditMode.
    /// </summary>
    public class TemplateSubjectTests
    {
        // Track everything created so [TearDown] can dispose it. No test leaks
        // GameObjects into the next (SKILL.md Hard Rule #10).
        readonly List<Object> _created = new();

        [TearDown]
        public void TearDown()
        {
            for (var i = 0; i < _created.Count; i++)
            {
                if (_created[i] != null)
                {
                    // EditMode requires DestroyImmediate; Object.Destroy is deferred
                    // and illegal at edit time (guides/00-principles.md Rule #8).
                    Object.DestroyImmediate(_created[i]);
                }
            }

            _created.Clear();
        }

        [Test]
        public void Subject_Behavior_Condition()
        {
            // ARRANGE — build the world this test needs, inline.
            var subject = CreateSubject();
            var start = subject.SomeValue;          // accessing a property triggers lazy-init

            // ACT — drive the extracted step yourself; nothing else will in EditMode.
            subject.Tick(1f);

            // ASSERT — direction for balance-owned values, exact for clamped values,
            // tolerance for floats (guides/04-nunit-assertion-patterns.md).
            Assert.Less(subject.SomeValue, start, "Subject should change in this direction.");
        }

        // --- helpers ---

        // Build the system under test as a tracked GameObject + component.
        SomeComponent CreateSubject()
        {
            var go = Track(new GameObject("Subject"));
            return go.AddComponent<SomeComponent>();
        }

        // Code-built ScriptableObject content (the "data double"). Requires the
        // Unity runtime — which is why this suite only runs in Unity batchmode,
        // not plain dotnet (guides/10-test-doubles-and-fixtures.md).
        // ItemDefinition MakeItem(string id, ItemCategory category)
        // {
        //     var item = Track(ScriptableObject.CreateInstance<ItemDefinition>());
        //     item.id = id;
        //     item.category = category;
        //     return item;
        // }

        T Track<T>(T value) where T : Object
        {
            _created.Add(value);
            return value;
        }
    }
}
